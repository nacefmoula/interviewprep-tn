package com.microservice.mentorshipservice.clients;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Component
public class GroqClient {

    private static final String DEFAULT_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String DEFAULT_MODEL = "llama-3.1-8b-instant";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    private final ThreadLocal<String> lastError = new ThreadLocal<>();

    public GroqClient(
            RestClient.Builder builder,
            @Value("${groq.api.key:}") String apiKey,
            @Value("${groq.api.url:}") String apiUrl,
            @Value("${groq.model:}") String model
    ) {
        this.apiKey = apiKey;

        String effectiveUrl = (apiUrl == null || apiUrl.isBlank()) ? DEFAULT_API_URL : apiUrl;
        this.model = (model == null || model.isBlank()) ? DEFAULT_MODEL : model;

        this.restClient = builder
                .baseUrl(effectiveUrl)
                .build();
    }

    /**
     * @return Groq output text, or empty string when disabled/unavailable.
     */
    public String generate(String prompt) {
        lastError.remove();

        if (apiKey == null || apiKey.isBlank()) {
            lastError.set("disabled");
            return "";
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of(
                                    "role", "user",
                                    "content", prompt
                            )
                    ),
                    "temperature", 0.7,
                    "max_tokens", 512
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) return "";

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return "";

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) return "";

            Object content = message.get("content");
            if (content instanceof String s) {
                return s;
            }

            return "";

        } catch (RestClientResponseException e) {
            int status = e.getStatusCode() == null ? -1 : e.getStatusCode().value();
            String body = e.getResponseBodyAsString();

            String lowerBody = body == null ? "" : body.toLowerCase();
            String lowerMsg = e.getMessage() == null ? "" : e.getMessage().toLowerCase();

            if (status == 400
                    && (lowerBody.contains("model_decommissioned")
                    || lowerBody.contains("decommissioned")
                    || lowerBody.contains("deprecated"))) {
                lastError.set("model_decommissioned");

            } else if (status == 401
                    || lowerBody.contains("invalid_api_key")
                    || lowerBody.contains("invalid api key")) {
                lastError.set("invalid_key");
            } else if (status == 429
                    || lowerBody.contains("insufficient_quota")
                    || lowerMsg.contains("quota")
                    || lowerMsg.contains("rate")) {
                lastError.set("quota");
            } else {
                lastError.set("error");
            }

            System.err.println("Groq API error: status=" + status + ", body=" + (body == null ? "" : body));
            return "";

        } catch (Exception e) {
            lastError.set("error");
            String msg = e.getMessage() == null ? "" : e.getMessage();
            System.err.println("Groq API error: " + msg);
            return "";
        }
    }

    public String consumeLastError() {
        String v = lastError.get();
        lastError.remove();
        return v;
    }
}
