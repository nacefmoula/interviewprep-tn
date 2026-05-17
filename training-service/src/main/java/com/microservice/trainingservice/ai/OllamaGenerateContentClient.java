package com.microservice.trainingservice.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class OllamaGenerateContentClient {

    @Value("${app.ollama.base-url:http://localhost:11434}")
    private String baseUrl;

    @Value("${app.ollama.model:llama3.2:3b}")
    private String model;

    @Value("${app.ollama.timeout-seconds:300}")
    private int timeoutSeconds;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OllamaGenerateContentClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().build();
    }

    public boolean isConfigured() {
        return true; // Ollama is local, always assumed configured if URL is set
    }

    public String generate(String systemInstruction, List<GeminiGenerateContentClient.Content> contents) {
        return generateInternal(systemInstruction, contents, false);
    }

    public String generateJson(String systemInstruction, List<GeminiGenerateContentClient.Content> contents) {
        return generateInternal(systemInstruction, contents, true);
    }

    public String generateJson(String systemInstruction, List<GeminiGenerateContentClient.Content> contents, Double temperatureOverride) {
        return generateInternal(systemInstruction, contents, true);
    }

    private String generateInternal(String systemInstruction, List<GeminiGenerateContentClient.Content> contents, boolean isJson) {
        try {
            String combinedPrompt = (systemInstruction != null ? systemInstruction + "\n\n" : "") +
                contents.stream()
                    .flatMap(c -> c.parts().stream())
                    .map(GeminiGenerateContentClient.Part::text)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining("\n"));

            var root = objectMapper.createObjectNode();
            root.put("model", model);
            root.put("prompt", combinedPrompt);
            root.put("stream", false);
            if (isJson) {
                root.put("format", "json");
            }

            String requestBody = objectMapper.writeValueAsString(root);
            String url = baseUrl + "/api/generate";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama API error — HTTP " + response.statusCode());
            }

            JsonNode responseRoot = objectMapper.readTree(response.body());
            JsonNode responseNode = responseRoot.path("response");
            
            if (responseNode.isMissingNode() || responseNode.isNull() || responseNode.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned empty response");
            }

            return responseNode.asText().trim();

        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to call Ollama API: " + ex.getMessage(), ex);
        }
    }
}
