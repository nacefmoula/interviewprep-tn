package com.microservice.resourceservice.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.resourceservice.ai.service.OllamaClient;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.model.ResourceCategory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OllamaAiResourceProvider implements AiResourceProvider {

    private final OllamaClient ollamaClient;
    private final ObjectMapper objectMapper;

    @Override
    public List<AiResourceDraft> generate(
        ResourceCategory category,
        int count,
        IndustryEnum industry,
        ResourceLevelEnum level,
        ResourceTypeEnum type
    ) {
        IndustryEnum resolvedIndustry = industry != null ? industry : category.getIndustry();

        String levelHint = level != null ? level.name() : "vary";
        String typeHint = type != null ? type.name() : "vary";

        // Compact prompt ~60% shorter than before. Uses JSON-array format hint directly.
        String prompt = """
            JSON array of %d learning resources. category=%s industry=%s level=%s type=%s.
            Fields per item: title, description (1-2 sentences), url (https, not example.com),
            type [VIDEO|ARTICLE|PODCAST|QUIZ|BOOK], level [BEGINNER|INTERMEDIATE|ADVANCED],
            industry [TECHNOLOGY|FINANCE|HEALTHCARE|EDUCATION|MARKETING|ENGINEERING|LEGAL|CONSULTING|MEDIA|OTHER], thumbUrl (null ok).
            Output JSON only.
            """.formatted(
            count,
            category.getName(),
            resolvedIndustry.name(),
            levelHint,
            typeHint
        );

        if (!ollamaClient.isAvailable()) {
            throw new IllegalStateException("Ollama is not available at configured base-url");
        }

        // Cap output tokens based on count (~140 tokens per resource is plenty).
        int maxTokens = Math.min(2048, Math.max(256, count * 160));
        String content = sanitizeJson(ollamaClient.generate(prompt, maxTokens));
        try {
            return objectMapper.readValue(content, new TypeReference<List<AiResourceDraft>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse Ollama JSON. Content: {}", truncate(content, 800));
            throw new IllegalStateException("Failed to parse Ollama JSON output", e);
        }
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
        // Extract the first balanced JSON object/array (handles LLM preambles).
        String extracted = extractFirstBalancedJson(trimmed);
        return extracted != null ? extracted : trimmed;
    }

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

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max) + "…";
    }
}

