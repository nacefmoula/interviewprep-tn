package com.microservice.mentorshipservice.clients;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class GeminiClient {

    private static final String DEFAULT_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    private final RestClient restClient;
    private final String apiKey;

    private final ThreadLocal<String> lastError = new ThreadLocal<>();

    public GeminiClient(
            RestClient.Builder builder,
            @Value("${gemini.api.key}") String apiKey,
            @Value("${gemini.api.url}") String apiUrl) {
        this.apiKey = apiKey;

        String effectiveUrl = (apiUrl == null || apiUrl.isBlank()) ? DEFAULT_API_URL : apiUrl;
        this.restClient = builder
                .baseUrl(effectiveUrl)
                .build();
    }

    /**
     * @return Gemini output text, or empty string when disabled/unavailable.
     */
    public String generate(String prompt) {
        lastError.remove();

        if (apiKey == null || apiKey.isBlank()) {
            lastError.set("disabled");
            return "";
        }

        try {
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(
                        Map.of("text", prompt)
                    ))
                ),
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 512
                )
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("?key=" + apiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) return "";

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) response.get("candidates");

            if (candidates == null || candidates.isEmpty()) return "";

            @SuppressWarnings("unchecked")
            Map<String, Object> content =
                    (Map<String, Object>) candidates.get(0).get("content");

            if (content == null) return "";

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts =
                    (List<Map<String, Object>>) content.get("parts");

            if (parts == null || parts.isEmpty()) return "";

            return (String) parts.get(0).get("text");

        } catch (Exception e) {
            String msg = e.getMessage() == null ? "" : e.getMessage();
            if (msg.contains("429") || msg.contains("RESOURCE_EXHAUSTED") || msg.contains("Quota")) {
                lastError.set("quota");
            } else {
                lastError.set("error");
            }
            System.err.println("Gemini API error: " + msg);
            return "";
        }
    }

    public String consumeLastError() {
        String v = lastError.get();
        lastError.remove();
        return v;
    }
}
