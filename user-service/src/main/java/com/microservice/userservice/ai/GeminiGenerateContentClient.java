package com.microservice.userservice.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.annotation.JsonProperty;

@Component
public class GeminiGenerateContentClient {

    private final RestClient restClient;
    private final GoogleAiProperties props;

    public GeminiGenerateContentClient(RestClient googleAiRestClient, GoogleAiProperties props) {
        this.restClient = googleAiRestClient;
        this.props = props;
    }

    public String generate(String systemInstruction, List<Content> contents) {
        if (!StringUtils.hasText(props.getApiKey())) {
            throw new IllegalStateException("GOOGLE_AI_API_KEY is not configured");
        }

        GenerateContentRequest request = new GenerateContentRequest(
                systemInstruction == null || systemInstruction.isBlank() ? null : new SystemInstruction(List.of(new Part(systemInstruction))),
                contents,
                new GenerationConfig(props.getTemperature(), props.getMaxOutputTokens()));

        List<String> modelsToTry = new ArrayList<>();
        modelsToTry.add(props.getModel());
        if (props.getFallbackModels() != null) {
            for (String m : props.getFallbackModels()) {
                if (!StringUtils.hasText(m)) continue;
                if (m.equals(props.getModel())) continue;
                modelsToTry.add(m);
            }
        }

        GenerateContentResponse response = null;
        Exception lastException = null;

        for (int i = 0; i < modelsToTry.size(); i++) {
            String model = modelsToTry.get(i);
            boolean hasAnotherModel = (i + 1) < modelsToTry.size();
            try {
                response = restClient
                    .post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header("X-goog-api-key", props.getApiKey())
                    .body(request)
                    .retrieve()
                    .body(GenerateContentResponse.class);
                break;
            } catch (RestClientResponseException ex) {
                lastException = ex;
                int status = ex.getStatusCode().value();
                String body = ex.getResponseBodyAsString();

                if (status == 400 && body != null && body.contains("API_KEY_INVALID")) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini rejected the API key (API_KEY_INVALID). Verify GOOGLE_AI_API_KEY in infra/.env is the full key (usually starts with 'AIza' and is much longer than 10 chars). " +
                            "If it is full, check key restrictions / enabled APIs in Google AI Studio / Google Cloud.");
                }

                if (status == 429) {
                    if (hasAnotherModel) {
                        continue;
                    }
                    boolean quotaExceeded = body != null && body.contains("exceeded your current quota");
                    throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        quotaExceeded
                            ? "Gemini quota exceeded (429). Check plan/billing or switch to a lighter model (e.g. gemini-flash-lite-latest)."
                            : "Gemini rate-limited the request (429). Try again later.");
                }

                boolean modelUnavailable = (status == 404) || (status >= 500 && status <= 599);
                if (modelUnavailable && hasAnotherModel) {
                    continue;
                }

                if (status >= 500 && status <= 599) {
                    throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Gemini is temporarily unavailable (provider HTTP " + status + "). Try again later.",
                        ex);
                }

                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Gemini request failed (provider HTTP " + status + ")",
                    ex);
            } catch (ResourceAccessException ex) {
                lastException = ex;
                if (hasAnotherModel) {
                    continue;
                }
                throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Gemini request timed out or could not be reached. Try again later.",
                    ex);
            }
        }

        if (response == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Gemini request failed. Try again later.",
                lastException);
        }

        if (response == null || response.candidates == null || response.candidates.isEmpty()) {
            throw new IllegalStateException("Gemini returned no candidates");
        }

        Candidate first = response.candidates.getFirst();
        if (first == null || first.content == null || first.content.parts == null || first.content.parts.isEmpty()) {
            throw new IllegalStateException("Gemini response missing content");
        }

        // Gemini may return multiple text parts; concatenate them.
        String text = first.content.parts.stream()
                .filter(Objects::nonNull)
                .map(Part::text)
                .filter(StringUtils::hasText)
                .reduce("", String::concat)
                .trim();

        if (text.isBlank()) {
            throw new IllegalStateException("Gemini response missing text");
        }

        return text;
    }

    /** Google content message; role is typically "user" or "model". */
    public record Content(String role, List<Part> parts) {}

    public record Part(String text) {}

    public record SystemInstruction(List<Part> parts) {}

    public record GenerationConfig(
            double temperature,
            @JsonProperty("maxOutputTokens") int maxOutputTokens) {}

    public record GenerateContentRequest(
            SystemInstruction systemInstruction,
            List<Content> contents,
            GenerationConfig generationConfig) {}

    public record GenerateContentResponse(List<Candidate> candidates) {}

    public record Candidate(Content content) {}
}
