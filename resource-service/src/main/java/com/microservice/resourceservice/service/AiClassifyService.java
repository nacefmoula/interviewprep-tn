package com.microservice.resourceservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.resourceservice.ai.service.OllamaClient;
import com.microservice.resourceservice.config.AiGenerationProperties;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.model.ResourceCategory;
import com.microservice.resourceservice.repository.ResourceCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * "Tout remplir avec l'IA": given just a title (and optional description), asks the LLM
 * to classify type/level/industry and pick the best matching existing category, plus
 * suggest a description and tags. Used by the resource-creation form's 1-click action.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiClassifyService {

    private final OllamaClient ollamaClient;
    private final AiGenerationProperties props;
    private final ResourceCategoryRepository categoryRepository;
    private final ObjectMapper objectMapper;

    public record Classification(
        String title,
        String description,
        ResourceTypeEnum type,
        ResourceLevelEnum level,
        IndustryEnum industry,
        UUID categoryId,
        String categoryName,
        List<String> tags,
        String provider
    ) {}

    public Classification classify(String title, String descriptionHint) {
        String safeTitle = title == null ? "" : title.trim();
        if (safeTitle.length() < 3) {
            throw new IllegalArgumentException("Title must be at least 3 characters");
        }

        List<ResourceCategory> allCats = categoryRepository.findAll();
        String provider = resolveProvider();

        if ("ollama".equals(provider) && ollamaClient.isAvailable()) {
            try {
                Classification c = classifyWithOllama(safeTitle, descriptionHint, allCats);
                if (c != null) return c;
            } catch (Exception e) {
                log.warn("Ollama classify failed, falling back to heuristic: {}", e.getMessage());
            }
        }
        return heuristicClassify(safeTitle, descriptionHint, allCats);
    }

    // ============ Ollama path ============
    private Classification classifyWithOllama(String title, String descriptionHint, List<ResourceCategory> allCats) {
        title = PromptSanitizer.sanitizeTitle(title);
        descriptionHint = PromptSanitizer.sanitizeDescription(descriptionHint);
        String categoryList = allCats.stream()
            .map(c -> "- " + c.getName())
            .limit(40)
            .reduce("", (a, b) -> a + b + "\n");

        String prompt = """
            Classifie cette ressource. Réponds STRICTEMENT en JSON:
            {"type":"ARTICLE|VIDEO|PODCAST|QUIZ|BOOK",
             "level":"BEGINNER|INTERMEDIATE|ADVANCED",
             "industry":"TECHNOLOGY|FINANCE|HEALTHCARE|EDUCATION|MARKETING|ENGINEERING|LEGAL|CONSULTING|MEDIA|OTHER",
             "category":"nom exact d'une catégorie ci-dessous",
             "description":"2 phrases en français",
             "tags":["3-5 mots-clés en minuscule"]}

            Catégories disponibles:
            %s
            Titre: %s
            %s
            """.formatted(
            categoryList,
            title,
            descriptionHint != null && !descriptionHint.isBlank() ? "Description existante: " + descriptionHint : ""
        );

        String raw = ollamaClient.generate(prompt, 350);
        if (raw == null || raw.isBlank()) return null;

        ResourceTypeEnum type = ResourceTypeEnum.ARTICLE;
        ResourceLevelEnum level = ResourceLevelEnum.INTERMEDIATE;
        IndustryEnum industry = IndustryEnum.TECHNOLOGY;
        String description = null;
        String categoryName = null;
        List<String> tags = List.of();

        try {
            String json = extractFirstJson(raw);
            JsonNode node = objectMapper.readTree(json != null ? json : raw);
            type = parseEnumNode(node, "type", ResourceTypeEnum.class, ResourceTypeEnum.ARTICLE);
            level = parseEnumNode(node, "level", ResourceLevelEnum.class, ResourceLevelEnum.INTERMEDIATE);
            industry = parseEnumNode(node, "industry", IndustryEnum.class, IndustryEnum.TECHNOLOGY);
            description = node.path("description").asText(null);
            categoryName = node.path("category").asText(null);
            JsonNode tagsNode = node.path("tags");
            if (tagsNode.isArray()) {
                List<String> parsed = new ArrayList<>();
                for (JsonNode t : tagsNode) {
                    String s = t.asText("").trim().toLowerCase(Locale.ROOT);
                    if (!s.isBlank()) parsed.add(s);
                }
                tags = parsed;
            }
        } catch (Exception e) {
            log.warn("Jackson parse failed for classify response, using defaults: {}", e.getMessage());
        }

        ResourceCategory matchedCat = matchCategory(categoryName, allCats, industry);

        return new Classification(
            title,
            description == null || description.isBlank() ? "" : description,
            type,
            level,
            industry,
            matchedCat != null ? matchedCat.getId() : null,
            matchedCat != null ? matchedCat.getName() : null,
            tags != null ? tags : List.of(),
            "ollama"
        );
    }

    // ============ Heuristic fallback ============
    private Classification heuristicClassify(String title, String descriptionHint, List<ResourceCategory> allCats) {
        String lower = title.toLowerCase(Locale.ROOT);

        ResourceTypeEnum type = ResourceTypeEnum.ARTICLE;
        if (lower.matches(".*(video|vidéo|youtube|watch|regarder|film).*")) type = ResourceTypeEnum.VIDEO;
        else if (lower.matches(".*(podcast|spotify|audio|émission|episode).*")) type = ResourceTypeEnum.PODCAST;
        else if (lower.matches(".*(quiz|exercice|practice|kata|challenge).*")) type = ResourceTypeEnum.QUIZ;
        else if (lower.matches(".*(book|livre|ebook|chapitre).*")) type = ResourceTypeEnum.BOOK;

        ResourceLevelEnum level = ResourceLevelEnum.INTERMEDIATE;
        if (lower.matches(".*(beginner|débutant|intro|basics|fundamentals|starter|101).*")) level = ResourceLevelEnum.BEGINNER;
        else if (lower.matches(".*(advanced|avancé|expert|master|deep dive|pro).*")) level = ResourceLevelEnum.ADVANCED;

        final IndustryEnum industry = detectIndustry(lower);

        ResourceCategory matchedCat = allCats.stream()
            .filter(c -> c.getIndustry() == industry)
            .findFirst()
            .orElse(allCats.isEmpty() ? null : allCats.get(0));

        List<String> tags = List.of(
            industry.name().toLowerCase(),
            level.name().toLowerCase(),
            type.name().toLowerCase()
        );

        String description = descriptionHint != null && !descriptionHint.isBlank()
            ? descriptionHint
            : "Découvrez " + title.toLowerCase() + " à travers des exemples concrets et des pistes d'application immédiates.";

        return new Classification(
            title,
            description,
            type,
            level,
            industry,
            matchedCat != null ? matchedCat.getId() : null,
            matchedCat != null ? matchedCat.getName() : null,
            tags,
            "stub"
        );
    }

    private static IndustryEnum detectIndustry(String lower) {
        if (lower.matches(".*(finance|argent|bourse|invest|trading|budget|fintech).*")) return IndustryEnum.FINANCE;
        if (lower.matches(".*(marketing|seo|growth|brand|content).*")) return IndustryEnum.MARKETING;
        if (lower.matches(".*(santé|health|medical|medicine|wellness).*")) return IndustryEnum.HEALTHCARE;
        if (lower.matches(".*(éducation|education|pedagogy|learning|cours|formation).*")) return IndustryEnum.EDUCATION;
        if (lower.matches(".*(droit|legal|law|compliance|rgpd|gdpr).*")) return IndustryEnum.LEGAL;
        if (lower.matches(".*(consult|strategy|mckinsey|bcg).*")) return IndustryEnum.CONSULTING;
        if (lower.matches(".*(video editing|podcast|stream|design|creator|filmmaker).*")) return IndustryEnum.MEDIA;
        return IndustryEnum.TECHNOLOGY;
    }

    // ============ parsing helpers ============
    private static <E extends Enum<E>> E parseEnumNode(JsonNode root, String field, Class<E> type, E defaultValue) {
        String val = root.path(field).asText(null);
        if (val == null || val.isBlank()) return defaultValue;
        try { return Enum.valueOf(type, val.trim().toUpperCase(Locale.ROOT)); }
        catch (Exception e) { return defaultValue; }
    }

    private static String extractFirstJson(String text) {
        if (text == null) return null;
        int start = text.indexOf('{');
        if (start < 0) return null;
        int depth = 0;
        boolean inStr = false, esc = false;
        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inStr) { if (esc) { esc = false; } else if (c == '\\') { esc = true; } else if (c == '"') { inStr = false; } continue; }
            if (c == '"') { inStr = true; continue; }
            if (c == '{') depth++;
            else if (c == '}') { if (--depth == 0) return text.substring(start, i + 1); }
        }
        return null;
    }

    private static ResourceCategory matchCategory(String name, List<ResourceCategory> allCats, IndustryEnum industry) {
        if (name == null || name.isBlank()) {
            return allCats.stream().filter(c -> c.getIndustry() == industry).findFirst().orElse(null);
        }
        String norm = name.toLowerCase(Locale.ROOT).trim();
        // Exact match
        for (ResourceCategory c : allCats) {
            if (c.getName() != null && c.getName().toLowerCase(Locale.ROOT).equals(norm)) return c;
        }
        // Substring match
        for (ResourceCategory c : allCats) {
            if (c.getName() != null && (c.getName().toLowerCase(Locale.ROOT).contains(norm) || norm.contains(c.getName().toLowerCase(Locale.ROOT)))) return c;
        }
        // Industry fallback
        return allCats.stream().filter(c -> c.getIndustry() == industry).findFirst().orElse(null);
    }

    private String resolveProvider() {
        String configured = props.getProvider() == null ? "stub" : props.getProvider().trim().toLowerCase(Locale.ROOT);
        return "ollama".equals(configured) || "openai".equals(configured) ? configured : "stub";
    }
}
