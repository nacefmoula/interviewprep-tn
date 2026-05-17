package com.microservice.resourceservice.service;

import com.microservice.resourceservice.ai.service.OllamaClient;
import com.microservice.resourceservice.config.AiGenerationProperties;
import com.microservice.resourceservice.exception.ResourceNotFoundException;
import com.microservice.resourceservice.model.Resource;
import com.microservice.resourceservice.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.util.Locale;
import java.util.UUID;

/**
 * Translates a resource's title + description into a target language on demand.
 * Uses Ollama when available, with a deterministic heuristic fallback so the feature
 * never breaks even without an LLM.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiTranslationService {

    private final ResourceRepository resourceRepository;
    private final AiGenerationProperties props;
    private final OllamaClient ollamaClient;

    public record Translation(String lang, String title, String description, String provider) implements Serializable {}

    @Cacheable(value = "ai-translate", key = "#resourceId.toString() + ':' + #targetLang.toLowerCase()")
    public Translation translate(UUID resourceId, String targetLang) {
        Resource r = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));

        String lang = normalizeLang(targetLang);
        String title = r.getTitle() == null ? "" : r.getTitle();
        String description = r.getDescription() == null ? "" : r.getDescription();

        String provider = resolveProvider();
        if ("ollama".equals(provider) && ollamaClient.isAvailable()) {
            try {
                String prompt = buildPrompt(title, description, lang);
                String raw = ollamaClient.generate(prompt, 400);
                Translation parsed = parse(raw, lang);
                if (parsed != null) return new Translation(lang, parsed.title(), parsed.description(), "ollama");
            } catch (Exception e) {
                log.warn("Ollama translation failed, falling back: {}", e.getMessage());
            }
        }

        // Fallback: return original with a [FR→EN] / [EN→FR] marker. Not a real translation
        // but keeps the UX working when Ollama is down.
        String marker = "fr".equalsIgnoreCase(lang) ? "[Traduction auto]" : "[Auto translation]";
        return new Translation(lang, marker + " " + title, description, "stub");
    }

    private String resolveProvider() {
        String configured = props.getProvider() == null ? "stub" : props.getProvider().trim().toLowerCase(Locale.ROOT);
        return "ollama".equals(configured) || "openai".equals(configured) ? configured : "stub";
    }

    private static String normalizeLang(String lang) {
        if (lang == null) return "en";
        String l = lang.trim().toLowerCase(Locale.ROOT);
        if (l.startsWith("fr")) return "fr";
        if (l.startsWith("en")) return "en";
        if (l.startsWith("es")) return "es";
        if (l.startsWith("ar")) return "ar";
        return "en";
    }

    private static String buildPrompt(String title, String description, String targetLang) {
        String label = switch (targetLang) {
            case "fr" -> "français";
            case "es" -> "espagnol";
            case "ar" -> "arabe";
            default -> "anglais";
        };
        return """
            Traduis en %s. Output JSON strict:
            {"title":"...","description":"..."}
            Titre: %s
            Description: %s
            """.formatted(label, title, description);
    }

    private static Translation parse(String raw, String lang) {
        if (raw == null) return null;
        String extracted = extractFirstBalancedJson(raw);
        if (extracted == null) return null;
        try {
            int ti = extracted.indexOf("\"title\"");
            int di = extracted.indexOf("\"description\"");
            if (ti < 0 || di < 0) return null;
            String title = extractString(extracted, ti);
            String description = extractString(extracted, di);
            if (title == null) return null;
            return new Translation(lang, title, description == null ? "" : description, "ollama");
        } catch (Exception e) {
            return null;
        }
    }

    private static String extractString(String json, int fieldStart) {
        int colon = json.indexOf(':', fieldStart);
        if (colon < 0) return null;
        int open = json.indexOf('"', colon);
        if (open < 0) return null;
        StringBuilder sb = new StringBuilder();
        boolean escape = false;
        for (int i = open + 1; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escape) {
                switch (c) {
                    case 'n' -> sb.append('\n');
                    case 't' -> sb.append('\t');
                    case '"' -> sb.append('"');
                    case '\\' -> sb.append('\\');
                    default -> sb.append(c);
                }
                escape = false;
                continue;
            }
            if (c == '\\') { escape = true; continue; }
            if (c == '"') return sb.toString();
            sb.append(c);
        }
        return null;
    }

    private static String extractFirstBalancedJson(String text) {
        int start = -1;
        char openChar = 0, closeChar = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{' || c == '[') { start = i; openChar = c; closeChar = c == '{' ? '}' : ']'; break; }
        }
        if (start < 0) return null;
        int depth = 0; boolean inString = false; boolean escape = false;
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
            else if (c == closeChar) { depth--; if (depth == 0) return text.substring(start, i + 1); }
        }
        return null;
    }
}
