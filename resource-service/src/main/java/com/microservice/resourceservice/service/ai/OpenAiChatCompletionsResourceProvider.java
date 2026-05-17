package com.microservice.resourceservice.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.resourceservice.config.AiGenerationProperties;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.model.ResourceCategory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpenAiChatCompletionsResourceProvider implements AiResourceProvider {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AiGenerationProperties props;

    @Override
    public List<AiResourceDraft> generate(
        ResourceCategory category,
        int count,
        IndustryEnum industry,
        ResourceLevelEnum level,
        ResourceTypeEnum type
    ) {
        AiGenerationProperties.OpenAi openAi = props.getOpenai();
        if (openAi.getApiKey() == null || openAi.getApiKey().isBlank()) {
            throw new IllegalStateException("OpenAI API key is not configured (ai.generation.openai.api-key)");
        }

        IndustryEnum resolvedIndustry = industry != null ? industry : category.getIndustry();

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", openAi.getModel());
        payload.put("temperature", openAi.getTemperature());
        payload.put("messages", List.of(
            Map.of(
                "role", "system",
                "content", "You are a careful assistant that outputs ONLY valid JSON with no extra text."
            ),
            Map.of(
                "role", "user",
                "content", buildPrompt(category, count, resolvedIndustry, level, type)
            )
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAi.getApiKey().trim());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(openAi.getBaseUrl(), entity, String.class);
        String body = response.getBody();
        if (body == null || body.isBlank()) {
            throw new IllegalStateException("OpenAI response body is empty");
        }

        String content = extractContent(body);
        String json = sanitizeJson(content);

        List<AiResourceDraft> drafts;
        try {
            drafts = objectMapper.readValue(json, new TypeReference<List<AiResourceDraft>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse OpenAI JSON. Content: {}", truncate(json, 800));
            throw new IllegalStateException("Failed to parse OpenAI JSON output", e);
        }

        UUID categoryId = category.getId();
        return drafts.stream()
            .map(d -> new AiResourceDraft(
                d.title(),
                d.description(),
                d.url(),
                d.type() != null ? d.type() : (type != null ? type : ResourceTypeEnum.ARTICLE),
                d.level() != null ? d.level() : (level != null ? level : ResourceLevelEnum.BEGINNER),
                d.industry() != null ? d.industry() : resolvedIndustry,
                d.thumbUrl(),
                categoryId
            ))
            .toList();
    }

    private static String buildPrompt(
        ResourceCategory category,
        int count,
        IndustryEnum industry,
        ResourceLevelEnum level,
        ResourceTypeEnum type
    ) {
        String levelLine = level != null ? "All items MUST use level=" + level.name() + "." : "You may vary level across items.";
        String typeLine = type != null ? "All items MUST use type=" + type.name() + "." : "You may vary type across items.";

        return """
            Generate %d learning resources for this category:
            - categoryName: %s
            - industry: %s

            Output: a JSON array (no markdown) with exactly %d objects.
            Each object fields:
              - title (string, non-empty)
              - description (string, 1-3 sentences)
              - url (string, MUST start with https:// and MUST NOT contain example.com)
              - type (one of: VIDEO, ARTICLE, PODCAST, QUIZ, BOOK)
              - level (one of: BEGINNER, INTERMEDIATE, ADVANCED)
              - industry (one of: TECHNOLOGY, FINANCE, HEALTHCARE, EDUCATION, MARKETING, ENGINEERING, LEGAL, CONSULTING, MEDIA, OTHER)
              - thumbUrl (string or null)

            Constraints:
            - Use industry=%s for all items.
            - %s
            - %s
            """.formatted(
            count,
            category.getName(),
            industry.name(),
            count,
            industry.name(),
            levelLine,
            typeLine
        );
    }

    private String extractContent(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isTextual()) {
                return content.asText();
            }
        } catch (Exception ignored) {
            // Fall through.
        }
        return rawJson;
    }

    private static String sanitizeJson(String content) {
        if (content == null) {
            return "[]";
        }
        String trimmed = content.trim();
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
        return trimmed;
    }

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max) + "…";
    }
}
