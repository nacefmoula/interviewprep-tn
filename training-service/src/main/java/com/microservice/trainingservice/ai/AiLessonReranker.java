package com.microservice.trainingservice.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.trainingservice.model.TrainingCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class AiLessonReranker {

    private final OllamaGenerateContentClient aiClient;
    private final ObjectMapper objectMapper;

    @Value("${training.ai.lesson-rerank-enabled:true}")
    private boolean rerankEnabled;

    public record UserContext(
        String goal,
        String targetRole,
        String seniority,
        Integer minutesPerDay,
        Double globalScore,
        String preparationLevel,
        Integer totalSessionsCompleted,
        String language
    ) {}

    public record CandidateLesson(
        Long id,
        String title,
        String summary,
        String difficulty,
        Integer estimatedMinutes,
        List<String> tags
    ) {}

    public List<Long> rerank(
        TrainingCategory category,
        int desiredCount,
        UserContext user,
        List<CandidateLesson> candidates
    ) {
        if (desiredCount <= 0 || candidates == null || candidates.isEmpty()) {
            return List.of();
        }
        if (!rerankEnabled || !aiClient.isConfigured()) {
            return candidates.stream().map(CandidateLesson::id).toList();
        }

        int cap = Math.min(candidates.size(), 20);
        List<CandidateLesson> capped = candidates.subList(0, cap);

        String system = "You are a ranking engine. Output ONLY valid JSON. No markdown, no extra text.";
        String prompt = buildPrompt(category, desiredCount, user, capped);

        String raw = aiClient.generateJson(system, List.of(new GeminiGenerateContentClient.Content(
            "user",
            List.of(new GeminiGenerateContentClient.Part(prompt))
        )));

        List<Long> fallback = capped.stream().map(CandidateLesson::id).toList();
        try {
            JsonNode node = objectMapper.readTree(extractJson(raw));
            JsonNode idsNode = node.get("orderedLessonIds");
            if (idsNode == null || !idsNode.isArray()) {
                return fallback;
            }

            Set<Long> allowed = new HashSet<>(fallback);
            List<Long> ordered = new ArrayList<>();
            for (JsonNode idNode : idsNode) {
                if (!idNode.canConvertToLong()) continue;
                long id = idNode.asLong();
                if (allowed.contains(id) && !ordered.contains(id)) {
                    ordered.add(id);
                }
            }

            // Ensure we always return all candidates in some order.
            for (Long id : fallback) {
                if (!ordered.contains(id)) ordered.add(id);
            }

            return ordered;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String buildPrompt(
        TrainingCategory category,
        int desiredCount,
        UserContext user,
        List<CandidateLesson> candidates
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("category", category == null ? null : category.name());
        payload.put("desiredCount", desiredCount);

        Map<String, Object> userObj = new HashMap<>();
        userObj.put("goal", safe(user.goal()));
        userObj.put("targetRole", safe(user.targetRole()));
        userObj.put("seniority", safe(user.seniority()));
        userObj.put("minutesPerDay", user.minutesPerDay());
        userObj.put("globalScore", user.globalScore());
        userObj.put("preparationLevel", safe(user.preparationLevel()));
        userObj.put("totalSessionsCompleted", user.totalSessionsCompleted());
        userObj.put("language", safe(user.language()));
        payload.put("user", userObj);

        List<Map<String, Object>> cand = new ArrayList<>();
        for (CandidateLesson c : candidates) {
            Map<String, Object> o = new HashMap<>();
            o.put("id", c.id());
            o.put("title", safe(c.title()));
            o.put("summary", safe(c.summary()));
            o.put("difficulty", safe(c.difficulty()));
            o.put("estimatedMinutes", c.estimatedMinutes());
            o.put("tags", c.tags() == null ? List.of() : c.tags());
            cand.add(o);
        }
        payload.put("candidates", cand);

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            json = "{}";
        }

        return "Rerank the candidate lessons for maximum suitability.\n" +
            "Constraints: return ONLY JSON with shape {\\\"orderedLessonIds\\\": [..]}.\n" +
            "Rules: orderedLessonIds must include only candidate ids; keep same language if possible; prioritize match to goal/role/seniority and realistic minutes/day.\n" +
            "Input JSON: " + json;
    }

    private String safe(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isBlank() ? null : t;
    }

    private String extractJson(String raw) {
        if (raw == null) return "{}";
        String trimmed = raw.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }
}
