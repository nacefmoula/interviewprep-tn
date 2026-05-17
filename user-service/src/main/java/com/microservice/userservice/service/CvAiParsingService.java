package com.microservice.userservice.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.userservice.config.GroqProperties;
import com.microservice.userservice.dto.ParsedCvDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Extracts structured CV data (bio, skills, education, experiences) from raw text
 * by calling Groq's OpenAI-compatible chat-completions endpoint.
 *
 * Replaces the previous local-Ollama implementation. Public API ({@link #parse(String)})
 * is unchanged so callers keep working.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CvAiParsingService {

    private static final int MAX_TEXT_LENGTH = 3_500;

    private final GroqProperties groqProperties;
    private final ObjectMapper objectMapper;

    private HttpClient httpClient;

    @jakarta.annotation.PostConstruct
    void init() {
        if (groqProperties.getApiKey() == null || groqProperties.getApiKey().isBlank()) {
            log.warn("GROQ_API_KEY is not set — CV AI parsing will fail at request time. "
                    + "Set it in env (or app-secrets ConfigMap) before relying on CV parsing.");
        }
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(groqProperties.getTimeoutSeconds()))
                .build();
    }

    public ParsedCvDto parse(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            throw new CvParsingException("CV text is empty after extraction.");
        }

        String normalizedText = rawText.trim();
        String truncatedText = truncateText(normalizedText);

        log.info("Sending CV text to Groq ({} chars) using model {}",
                truncatedText.length(), groqProperties.getModel());

        String requestBody = buildRequestBody(truncatedText);
        String responseBody = callGroqApi(requestBody);

        return extractParsedCv(responseBody);
    }

    private String truncateText(String rawText) {
        if (rawText.length() <= MAX_TEXT_LENGTH) {
            return rawText;
        }

        log.warn("CV text too long ({} chars), truncating to {} chars",
                rawText.length(), MAX_TEXT_LENGTH);

        return rawText.substring(0, MAX_TEXT_LENGTH);
    }

    private static final String SYSTEM_PROMPT = """
            You extract CVs into ONE valid JSON object.
            No markdown. No explanation. No text before or after JSON.
            Never invent facts. Preserve the CV language where possible.

            Required JSON schema:
            {
              "bio": "string or null",
              "skills": ["string"],
              "educations": [
                {
                  "degree": "string or null",
                  "institution": "string or null",
                  "startDate": "YYYY-MM or null",
                  "endDate": "YYYY-MM or null",
                  "current": true or false,
                  "description": "string or null"
                }
              ],
              "experiences": [
                {
                  "jobTitle": "string or null",
                  "company": "string or null",
                  "startDate": "YYYY-MM or null",
                  "endDate": "YYYY-MM or null",
                  "current": true or false,
                  "description": "string or null"
                }
              ]
            }

            Rules:
            - skills, educations, experiences must always be arrays.
            - If date says Present, Current, Présent, or en cours: endDate=null and current=true.
            - If only a year is known, use YYYY-01.
            - Keep descriptions short.
            - Extract skills from any section.
            """;

    private String buildRequestBody(String cvText) {
        try {
            var root = objectMapper.createObjectNode();
            root.put("model", groqProperties.getModel());
            root.put("temperature", groqProperties.getTemperature());
            root.put("max_tokens", groqProperties.getMaxTokens());

            // Groq requires response_format=json_object → guarantees the model returns valid JSON
            var responseFormat = objectMapper.createObjectNode();
            responseFormat.put("type", "json_object");
            root.set("response_format", responseFormat);

            var messages = objectMapper.createArrayNode();

            var sys = objectMapper.createObjectNode();
            sys.put("role", "system");
            sys.put("content", SYSTEM_PROMPT);
            messages.add(sys);

            var user = objectMapper.createObjectNode();
            user.put("role", "user");
            user.put("content", "CV TEXT:\n---\n" + cvText + "\n---");
            messages.add(user);

            root.set("messages", messages);

            return objectMapper.writeValueAsString(root);
        } catch (Exception ex) {
            throw new CvParsingException("Failed to build Groq request body", ex);
        }
    }

    private String callGroqApi(String requestBody) {
        String url = groqProperties.getBaseUrl() + "/openai/v1/chat/completions";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + groqProperties.getApiKey())
                    .timeout(Duration.ofSeconds(groqProperties.getTimeoutSeconds()))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Groq API returned HTTP {} with body: {}",
                        response.statusCode(), truncateForLog(response.body()));
                throw new CvParsingException("Groq API error — HTTP " + response.statusCode());
            }

            log.debug("Groq response received ({} chars)", response.body().length());
            return response.body();

        } catch (CvParsingException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new CvParsingException("Failed to call Groq API: " + ex.getMessage(), ex);
        }
    }

    private ParsedCvDto extractParsedCv(String groqResponseBody) {
        try {
            JsonNode root = objectMapper.readTree(groqResponseBody);
            JsonNode content = root.path("choices").path(0).path("message").path("content");

            if (content.isMissingNode() || content.isNull() || content.asText().isBlank()) {
                log.error("Groq response missing choices[0].message.content. Raw body: {}",
                        truncateForLog(groqResponseBody));
                throw new CvParsingException("Could not locate valid response text in Groq response.");
            }

            String jsonText = content.asText().trim();
            log.debug("Raw Groq model output ({} chars): {}", jsonText.length(), truncateForLog(jsonText));

            // Strip markdown code blocks if the model sneaks them in (rare with json_object mode)
            if (jsonText.startsWith("```")) {
                jsonText = jsonText
                        .replaceAll("^```(?:json)?\\s*", "")
                        .replaceAll("```\\s*$", "")
                        .trim();
            }

            // Extract the first complete JSON object — defensive even though json_object mode
            // should already guarantee a clean JSON payload.
            String extracted = findFirstJsonObject(jsonText);
            if (extracted != null) {
                jsonText = extracted;
            }

            ParsedCvDto dto = objectMapper.readValue(jsonText, ParsedCvDto.class);

            if (dto.getSkills() == null) dto.setSkills(new ArrayList<>());
            if (dto.getEducations() == null) dto.setEducations(new ArrayList<>());
            if (dto.getExperiences() == null) dto.setExperiences(new ArrayList<>());

            log.info("Groq parsed CV — bio={}, skills={}, educations={}, experiences={}",
                    dto.getBio() != null ? "present" : "absent",
                    dto.getSkills().size(),
                    dto.getEducations().size(),
                    dto.getExperiences().size());

            return dto;

        } catch (CvParsingException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to deserialize Groq response into ParsedCvDto", ex);
            throw new CvParsingException(
                    "Groq returned invalid JSON for CV parsing: " + ex.getMessage(), ex);
        }
    }

    /**
     * Scans {@code text} character-by-character to find the first complete, balanced JSON
     * object ({...}). Handles nested objects, arrays, and strings (including escaped quotes).
     * Returns {@code null} if no complete object is found.
     */
    private String findFirstJsonObject(String text) {
        int start = -1;
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);

            if (escaped) {
                escaped = false;
                continue;
            }
            if (c == '\\' && inString) {
                escaped = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                continue;
            }
            if (inString) continue;

            if (c == '{') {
                if (depth == 0) start = i;
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0 && start >= 0) {
                    return text.substring(start, i + 1);
                }
            }
        }

        return null;
    }

    private String truncateForLog(String text) {
        if (text == null) return "<null>";
        return text.length() <= 300 ? text : text.substring(0, 300) + "…";
    }

    public static class CvParsingException extends RuntimeException {
        public CvParsingException(String message) {
            super(message);
        }

        public CvParsingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
