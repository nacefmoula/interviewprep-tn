package com.microservice.interviewservice.client;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.config.GroqProperties;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class GroqClient {

    private final GroqProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GroqClient(GroqProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(properties.resolvedBaseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public String ask(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            throw new IllegalArgumentException("Prompt is null or blank.");
        }

        String model = properties.resolvedModel();
        if (model == null || model.isBlank()) {
            throw new IllegalStateException("Groq model is null or blank.");
        }

        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(message);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("max_tokens", 1024);
        payload.put("messages", messages);

        try {
            String rawBody = restClient.post()
                    .uri("/openai/v1/chat/completions")
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            if (rawBody == null || rawBody.isBlank()) {
                throw new IllegalStateException("Groq returned an empty HTTP body.");
            }

            JsonNode json = objectMapper.readTree(rawBody);
            JsonNode contentNode = json.path("choices").path(0).path("message").path("content");

            if (contentNode.isMissingNode() || contentNode.isNull()) {
                throw new IllegalStateException(
                        "Groq response did not contain choices[0].message.content. Raw body: " + rawBody
                );
            }

            return contentNode.asText();

        } catch (RestClientResponseException ex) {
            String hint = switch (ex.getStatusCode().value()) {
                case 401 -> "Invalid API key. Check GROQ_API_KEY.";
                case 429 -> "Groq rate limit reached.";
                default -> "Groq API error.";
            };
            throw new IllegalStateException(
                    hint + " Response body: " + ex.getResponseBodyAsString(), ex
            );
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Groq request failed: " + ex.getClass().getSimpleName() + " - " + ex.getMessage(), ex
            );
        }
    }

    public static String stripJsonFences(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        String trimmed = text.trim();

        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7).trim();
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3).trim();
        }

        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3).trim();
        }

        return trimmed;
    }
}