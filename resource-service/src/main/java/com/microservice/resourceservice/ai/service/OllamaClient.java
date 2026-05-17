package com.microservice.resourceservice.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.resourceservice.ai.config.OllamaProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
@Slf4j
public class OllamaClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final OllamaProperties props;

    public boolean isAvailable() {
        try {
            ResponseEntity<String> res = restTemplate.getForEntity(props.getBaseUrl() + "/api/version", String.class);
            return res.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Warm-up: fires a trivial "ok" prompt at startup so Ollama pre-loads the model into memory.
     * With keep_alive=30m on each request, the model stays resident → the first user doesn't
     * pay the cold-start tax (10-15s on CPU).
     * Runs asynchronously so boot doesn't block. Silent on failure (e.g. host Ollama not running).
     */
    @jakarta.annotation.PostConstruct
    public void warmUp() {
        Thread t = new Thread(() -> {
            try {
                // Tiny wait so other services settle first
                Thread.sleep(2_000);
                if (!isAvailable()) {
                    log.info("Ollama warm-up skipped: service not reachable at {}", props.getBaseUrl());
                    return;
                }
                log.info("Warming up Ollama model '{}'…", props.getModel());
                long start = System.currentTimeMillis();
                generate("ok", 8);
                long ms = System.currentTimeMillis() - start;
                log.info("Ollama warm-up complete in {}ms — model '{}' ready.", ms, props.getModel());
            } catch (Exception e) {
                log.info("Ollama warm-up failed (will retry on first real request): {}", e.getMessage());
            }
        }, "ollama-warmup");
        t.setDaemon(true);
        t.start();
    }

    public String generate(String prompt) {
        return generate(prompt, null);
    }

    /**
     * Streams Ollama generation line-by-line. Each response chunk is a JSON object
     * with {"response":"...", "done":false|true}. Emits each `response` token to the
     * consumer as it arrives. Runs synchronously in the calling thread.
     *
     * @return the final concatenated response text
     */
    public String generateStream(String prompt, Integer maxTokens, Consumer<String> onToken) {
        Map<String, Object> options = new HashMap<>();
        options.put("temperature", 0.5);
        options.put("top_p", 0.9);
        options.put("num_predict", maxTokens != null ? maxTokens : 300);
        options.put("repeat_penalty", 1.1);

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", props.getModel());
        payload.put("prompt", prompt);
        payload.put("stream", true);
        payload.put("keep_alive", "30m");
        payload.put("options", options);

        String body;
        try {
            body = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encode Ollama request", e);
        }

        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(props.getBaseUrl() + "/api/generate"))
            .header("Content-Type", "application/json")
            .timeout(Duration.ofMillis(props.getTimeoutMs()))
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
            .build();

        StringBuilder full = new StringBuilder();
        try {
            HttpResponse<java.util.stream.Stream<String>> resp =
                client.send(req, HttpResponse.BodyHandlers.ofLines());
            if (resp.statusCode() / 100 != 2) {
                throw new IllegalStateException("Ollama stream HTTP " + resp.statusCode());
            }
            try (java.util.stream.Stream<String> lines = resp.body()) {
                lines.forEach(line -> {
                    if (line == null || line.isBlank()) return;
                    try {
                        JsonNode node = objectMapper.readTree(line);
                        String token = node.path("response").asText("");
                        if (!token.isEmpty()) {
                            full.append(token);
                            try { onToken.accept(token); } catch (Exception ignored) { /* consumer failure */ }
                        }
                        if (node.path("done").asBoolean(false)) {
                            // done — stream will end naturally
                        }
                    } catch (Exception parseEx) {
                        log.debug("Ignoring non-JSON Ollama line: {}", line);
                    }
                });
            }
        } catch (Exception e) {
            throw new IllegalStateException("Ollama streaming failed: " + e.getMessage(), e);
        }
        return full.toString();
    }

    /**
     * Single-shot Ollama generate call tuned for speed:
     *  - keep_alive=30m keeps the model loaded so follow-up calls skip cold reload
     *  - num_predict caps the output length so the LLM stops earlier
     *  - temperature / top_p calibrated for concise, deterministic-ish output
     *  - format="json" (when maxTokens hint provided) nudges the model toward valid JSON
     */
    public String generate(String prompt, Integer maxTokens) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> options = new HashMap<>();
        options.put("temperature", 0.5);
        options.put("top_p", 0.9);
        options.put("num_predict", maxTokens != null ? maxTokens : 512);
        // Ollama-specific: repeat_penalty helps avoid stalling on repeated tokens
        options.put("repeat_penalty", 1.1);

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", props.getModel());
        payload.put("prompt", prompt);
        payload.put("stream", false);
        payload.put("keep_alive", "30m");
        payload.put("options", options);
        // Strong hint: treat output as JSON. Ollama supports "format":"json".
        payload.put("format", "json");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(props.getBaseUrl() + "/api/generate", entity, String.class);
        String body = response.getBody();
        if (body == null || body.isBlank()) {
            throw new IllegalStateException("Ollama response body is empty");
        }

        // Expected shape: { "response": "..." } but keep fallback.
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode text = root.path("response");
            if (text.isTextual()) {
                return text.asText();
            }
        } catch (Exception e) {
            log.debug("Ollama response was not JSON. Using raw body.");
        }
        return body;
    }
}

