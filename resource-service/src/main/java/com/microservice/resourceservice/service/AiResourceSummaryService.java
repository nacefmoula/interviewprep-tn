package com.microservice.resourceservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.resourceservice.ai.service.OllamaClient;
import com.microservice.resourceservice.config.AiGenerationProperties;
import com.microservice.resourceservice.dto.AiResourceSummaryResponse;
import com.microservice.resourceservice.exception.ResourceNotFoundException;
import com.microservice.resourceservice.model.Resource;
import com.microservice.resourceservice.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiResourceSummaryService {

    private final ResourceRepository resourceRepository;
    private final AiGenerationProperties props;
    private final OllamaClient ollamaClient;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Cached by resourceId. First call hits the LLM (slow), subsequent calls
     * return instantly from Redis for up to 30 min.
     */
    @Cacheable(value = "ai-summary", key = "#resourceId.toString()")
    public AiResourceSummaryResponse summarize(UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));

        String provider = resolveProvider();
        LocalDateTime now = LocalDateTime.now();
        log.info("Summarizing resource {} via provider={}", resourceId, provider);

        return switch (provider) {
            case "ollama" -> summarizeWithOllama(resource, now);
            case "openai" -> summarizeWithOpenAi(resource, now);
            case "groq" -> summarizeWithGroq(resource, now);
            default -> summarizeStub(resource, now);
        };
    }

    /** Drops the cached summary for a resource so the next call regenerates it. */
    @CacheEvict(value = "ai-summary", key = "#resourceId.toString()")
    public void evictSummary(UUID resourceId) {
        log.info("Evicted cached summary for resource {}", resourceId);
    }

    /**
     * Streams the summary via SSE. Tokens are relayed live as Ollama produces them.
     * When done, the full parsed {summary, keyPoints} payload is sent as a final "done" event.
     * Runs the generation on a separate thread so the controller can return immediately.
     */
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamSummary(UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));

        // Long timeout: wait up to 3 min for the full generation.
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter =
            new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(180_000L);

        String provider = resolveProvider();
        LocalDateTime now = LocalDateTime.now();

        // Groq: real OpenAI-compatible token streaming
        if ("groq".equals(provider)) {
            java.util.concurrent.CompletableFuture.runAsync(() ->
                streamWithGroq(resource, emitter, now));
            return emitter;
        }

        // stub / openai: fall back to non-streaming path — send the full response as one "token" + "done"
        if (!"ollama".equals(provider) || !ollamaClient.isAvailable()) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    AiResourceSummaryResponse resp = summarize(resourceId);
                    if (resp.getSummary() != null && !resp.getSummary().isEmpty()) {
                        emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name("token").data(resp.getSummary()));
                    }
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("done").data(objectMapper.writeValueAsString(resp)));
                    emitter.complete();
                } catch (Exception e) {
                    emitter.completeWithError(e);
                }
            });
            return emitter;
        }

        String prompt = buildPrompt(resource);

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            StringBuilder full = new StringBuilder();
            try {
                ollamaClient.generateStream(prompt, 300, token -> {
                    full.append(token);
                    try {
                        emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name("token").data(token));
                    } catch (Exception sendEx) {
                        // Client disconnected — swallow; generation will finish on its own
                    }
                });
                AiResourceSummaryResponse parsed = parseSummary(resource, "ollama", full.toString(), now);
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                    .name("done").data(objectMapper.writeValueAsString(parsed)));
                emitter.complete();
            } catch (Exception e) {
                log.warn("SSE streaming failed, falling back to non-streaming: {}", e.getMessage());
                try {
                    AiResourceSummaryResponse fallback = summarize(resourceId);
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("done").data(objectMapper.writeValueAsString(fallback)));
                    emitter.complete();
                } catch (Exception e2) {
                    emitter.completeWithError(e2);
                }
            }
        });

        return emitter;
    }

    private AiResourceSummaryResponse summarizeWithOllama(Resource r, LocalDateTime now) {
        if (!ollamaClient.isAvailable()) {
            if (props.isFallbackToStub()) {
                return summarizeStub(r, now);
            }
            throw new IllegalStateException("Ollama is not available at configured base-url");
        }

        String prompt = buildPrompt(r);
        String content = ollamaClient.generate(prompt, 300);
        return parseSummary(r, "ollama", content, now);
    }

    private AiResourceSummaryResponse summarizeWithOpenAi(Resource r, LocalDateTime now) {
        AiGenerationProperties.OpenAi openAi = props.getOpenai();
        if (openAi.getApiKey() == null || openAi.getApiKey().isBlank()) {
            if (props.isFallbackToStub()) {
                return summarizeStub(r, now);
            }
            throw new IllegalStateException("OpenAI API key is not configured (ai.generation.openai.api-key)");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", openAi.getModel());
        payload.put("temperature", 0.3);
        payload.put("messages", List.of(
            Map.of("role", "system", "content", "You output ONLY valid JSON (no markdown, no extra text)."),
            Map.of("role", "user", "content", buildPrompt(r))
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAi.getApiKey().trim());
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(openAi.getBaseUrl(), entity, String.class);
        String body = response.getBody();
        if (body == null || body.isBlank()) {
            if (props.isFallbackToStub()) {
                return summarizeStub(r, now);
            }
            throw new IllegalStateException("OpenAI response body is empty");
        }

        String content = extractOpenAiContent(body);
        return parseSummary(r, "openai", content, now);
    }

    private AiResourceSummaryResponse summarizeWithGroq(Resource r, LocalDateTime now) {
        AiGenerationProperties.Groq groq = props.getGroq();
        if (groq.getApiKey() == null || groq.getApiKey().isBlank()) {
            log.warn("Groq API key not configured — falling back to stub");
            return summarizeStub(r, now);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", groq.getModel());
        payload.put("temperature", groq.getTemperature());
        payload.put("messages", List.of(
            Map.of("role", "system", "content", "You output ONLY valid JSON (no markdown, no extra text)."),
            Map.of("role", "user", "content", buildPrompt(r))
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groq.getApiKey().trim());
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(groq.getBaseUrl(), entity, String.class);
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                return props.isFallbackToStub() ? summarizeStub(r, now) : null;
            }
            String content = extractOpenAiContent(body);
            return parseSummary(r, "groq", content, now);
        } catch (Exception e) {
            log.warn("Groq summarize failed: {} — falling back to stub", e.getMessage());
            return summarizeStub(r, now);
        }
    }

    /**
     * Streams Groq tokens via OpenAI-compatible SSE format.
     * Each chunk: data: {"choices":[{"delta":{"content":"token"}}]}
     * Last chunk: data: [DONE]
     */
    private void streamWithGroq(Resource resource,
                                 org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter,
                                 LocalDateTime now) {
        AiGenerationProperties.Groq groq = props.getGroq();
        if (groq.getApiKey() == null || groq.getApiKey().isBlank()) {
            log.warn("Groq API key not configured — streaming stub fallback");
            try {
                AiResourceSummaryResponse stub = summarizeStub(resource, now);
                if (stub.getSummary() != null) {
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("token").data(stub.getSummary()));
                }
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                    .name("done").data(objectMapper.writeValueAsString(stub)));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", groq.getModel());
        payload.put("temperature", groq.getTemperature());
        payload.put("stream", true);
        payload.put("messages", List.of(
            Map.of("role", "system", "content", "You output ONLY valid JSON (no markdown, no extra text)."),
            Map.of("role", "user", "content", buildPrompt(resource))
        ));

        String bodyJson;
        try {
            bodyJson = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            emitter.completeWithError(e);
            return;
        }

        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(groq.getBaseUrl()))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + groq.getApiKey().trim())
            .timeout(Duration.ofMillis(groq.getTimeoutMs()))
            .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
            .build();

        StringBuilder full = new StringBuilder();
        try {
            HttpResponse<java.io.InputStream> resp = client.send(req, HttpResponse.BodyHandlers.ofInputStream());
            if (resp.statusCode() / 100 != 2) {
                throw new IllegalStateException("Groq stream HTTP " + resp.statusCode());
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resp.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isEmpty()) continue;
                    if (!line.startsWith("data:")) continue;
                    String data = line.substring(5).trim();
                    if ("[DONE]".equals(data)) break;
                    try {
                        JsonNode chunk = objectMapper.readTree(data);
                        String token = chunk.path("choices").path(0).path("delta").path("content").asText("");
                        if (!token.isEmpty()) {
                            full.append(token);
                            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                                .name("token").data(token));
                        }
                    } catch (Exception parseEx) {
                        // skip malformed chunk
                    }
                }
            }

            AiResourceSummaryResponse parsed = parseSummary(resource, "groq", full.toString(), now);
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                .name("done").data(objectMapper.writeValueAsString(parsed)));
            emitter.complete();
        } catch (Exception e) {
            log.warn("Groq streaming failed: {} — falling back to stub", e.getMessage());
            try {
                AiResourceSummaryResponse fallback = summarizeStub(resource, now);
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                    .name("done").data(objectMapper.writeValueAsString(fallback)));
                emitter.complete();
            } catch (Exception e2) {
                emitter.completeWithError(e2);
            }
        }
    }

    private AiResourceSummaryResponse summarizeStub(Resource r, LocalDateTime now) {
        String title = r.getTitle() == null ? "ce sujet" : r.getTitle().trim();
        String description = r.getDescription() == null ? "" : r.getDescription().trim();
        String categoryName = r.getCategory() != null && r.getCategory().getName() != null
            ? r.getCategory().getName() : "général";
        String levelLabel = humanLevelFr(r.getLevel() == null ? "" : r.getLevel().name());
        String typeLabel = humanTypeFr(r.getType() == null ? "" : r.getType().name());

        // Multi-sentence narrative synthesis (not just "Résumé: ...")
        StringBuilder summary = new StringBuilder();
        summary.append(String.format("« %s » est %s centré sur %s.", title, typeLabel, categoryName.toLowerCase()));
        if (!description.isBlank()) {
            String firstSentence = firstSentence(description);
            summary.append(" ").append(firstSentence);
        }
        summary.append(String.format(" Ce contenu s'adresse à un public %s et peut être parcouru en quelques sessions ciblées.",
            levelLabel));
        summary.append(" Il combine concepts fondamentaux et exemples pratiques pour ancrer les apprentissages durablement.");

        // Rich, actionable key points in French
        List<String> points = new ArrayList<>();
        points.add(String.format("Format : %s · Niveau : %s", capitalize(typeLabel), capitalize(levelLabel)));
        points.add(String.format("Catégorie principale : %s", categoryName));
        points.add(actionPointForLevel(r.getLevel() == null ? "" : r.getLevel().name()));
        points.add("À lire/regarder activement : prenez des notes et essayez chaque exemple.");
        points.add(String.format("Prochaine étape : appliquer les idées sur un mini-projet ou une étude de cas liée à %s.",
            categoryName.toLowerCase()));

        return AiResourceSummaryResponse.builder()
            .resourceId(r.getId())
            .provider("stub")
            .summary(summary.toString())
            .keyPoints(points)
            .generatedAt(now)
            .build();
    }

    private static String humanLevelFr(String level) {
        return switch (level == null ? "" : level.toUpperCase(Locale.ROOT)) {
            case "BEGINNER" -> "débutant";
            case "INTERMEDIATE" -> "intermédiaire";
            case "ADVANCED" -> "avancé";
            default -> "tous niveaux";
        };
    }

    private static String humanTypeFr(String type) {
        return switch (type == null ? "" : type.toUpperCase(Locale.ROOT)) {
            case "VIDEO" -> "une vidéo";
            case "ARTICLE" -> "un article";
            case "PODCAST" -> "un podcast";
            case "BOOK" -> "un livre de référence";
            case "QUIZ" -> "un exercice pratique";
            default -> "une ressource";
        };
    }

    private static String actionPointForLevel(String level) {
        return switch (level == null ? "" : level.toUpperCase(Locale.ROOT)) {
            case "BEGINNER" -> "Parfait comme premier contact : construisez d'abord une intuition avant d'entrer dans les détails.";
            case "INTERMEDIATE" -> "Idéal pour consolider les bases : comparez avec vos pratiques actuelles.";
            case "ADVANCED" -> "Pour aller plus loin : identifiez les trade-offs cachés et les cas limites.";
            default -> "Abordez le contenu par couches : survol rapide puis relecture ciblée.";
        };
    }

    private static String firstSentence(String text) {
        if (text == null) return "";
        String trimmed = text.trim();
        int dot = trimmed.indexOf('.');
        int excl = trimmed.indexOf('!');
        int q = trimmed.indexOf('?');
        int end = Math.min(pickPositive(dot), Math.min(pickPositive(excl), pickPositive(q)));
        if (end == Integer.MAX_VALUE || end <= 0) {
            return trimmed.length() > 180 ? trimmed.substring(0, 180) + "…" : trimmed;
        }
        return trimmed.substring(0, end + 1);
    }

    private static int pickPositive(int i) { return i > 0 ? i : Integer.MAX_VALUE; }

    private static String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private String resolveProvider() {
        String configured = props.getProvider() == null ? "stub" : props.getProvider().trim().toLowerCase(Locale.ROOT);
        if (!List.of("stub", "ollama", "openai", "groq").contains(configured)) {
            return "stub";
        }
        return configured;
    }

    private static String buildPrompt(Resource r) {
        String title = r.getTitle() == null ? "" : r.getTitle().trim();
        String description = r.getDescription() == null ? "" : r.getDescription().trim();
        String category = r.getCategory() != null ? r.getCategory().getName() : "";

        return """
            Réponds UNIQUEMENT avec du JSON valide, sans texte avant ni après.
            Format requis : {"summary":"...","keyPoints":["...","...","..."]}
            Règles :
            - summary : 2 à 3 phrases en français résumant cette ressource
            - keyPoints : liste de 3 points clés courts et utiles en français
            Ressource à analyser :
            Titre : %s | Catégorie : %s | Type : %s | Niveau : %s
            Description : %s
            """.formatted(title, category, r.getType(), r.getLevel(), description);
    }

    private AiResourceSummaryResponse parseSummary(Resource resource, String provider, String content, LocalDateTime now) {
        String json = sanitizeJson(content);
        try {
            JsonNode root = objectMapper.readTree(json);
            String summary = root.path("summary").asText("");

            List<String> points = new ArrayList<>();
            JsonNode arr = root.path("keyPoints");
            if (arr.isArray()) {
                for (JsonNode n : arr) {
                    if (n.isTextual() && !n.asText().trim().isBlank()) {
                        points.add(n.asText().trim());
                    }
                }
            }

            if (summary.isBlank()) {
                log.warn("AI provider={} returned blank summary for resource={}, falling back to stub", provider, resource.getId());
                return summarizeStub(resource, now);
            }

            return AiResourceSummaryResponse.builder()
                .resourceId(resource.getId())
                .provider(provider)
                .summary(summary)
                .keyPoints(points)
                .generatedAt(now)
                .build();
        } catch (Exception e) {
            log.warn("Failed to parse AI summary JSON; falling back to stub. Provider={}, err={}", provider, e.getMessage());
            return summarizeStub(resource, now);
        }
    }

    private String extractOpenAiContent(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isTextual()) {
                return content.asText();
            }
        } catch (Exception ignored) {
            // fall through
        }
        return rawJson;
    }

    private static String sanitizeJson(String content) {
        if (content == null) {
            return "{}";
        }
        String trimmed = content.trim();
        // Strip code fences like ```json ... ```
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline > 0) {
                trimmed = trimmed.substring(firstNewline + 1);
            }
            int lastFence = trimmed.lastIndexOf("```");
            if (lastFence >= 0) {
                trimmed = trimmed.substring(0, lastFence);
            }
            trimmed = trimmed.trim();
        }
        // Extract the first balanced JSON object/array from wrapped LLM output
        // (e.g. "Voici le résumé... {\"summary\":...}").
        String extracted = extractFirstBalancedJson(trimmed);
        return extracted != null ? extracted : trimmed;
    }

    /**
     * Finds the first balanced JSON object or array inside the text.
     * Handles nested braces/brackets and strings (with escape sequences).
     * Returns null if no balanced JSON can be located.
     */
    private static String extractFirstBalancedJson(String text) {
        if (text == null) return null;
        int start = -1;
        char openChar = 0;
        char closeChar = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{' || c == '[') {
                start = i;
                openChar = c;
                closeChar = (c == '{') ? '}' : ']';
                break;
            }
        }
        if (start < 0) return null;

        int depth = 0;
        boolean inString = false;
        boolean escape = false;
        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inString) {
                if (escape) { escape = false; continue; }
                if (c == '\\') { escape = true; continue; }
                if (c == '"') inString = false;
                continue;
            }
            if (c == '"') { inString = true; continue; }
            if (c == openChar) depth++;
            else if (c == closeChar) {
                depth--;
                if (depth == 0) return text.substring(start, i + 1);
            }
        }
        return null;
    }
}

