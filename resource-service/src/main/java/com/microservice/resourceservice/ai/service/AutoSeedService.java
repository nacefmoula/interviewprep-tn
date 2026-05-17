package com.microservice.resourceservice.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.resourceservice.dto.ResourceCategoryRequest;
import com.microservice.resourceservice.dto.ResourceCategoryResponse;
import com.microservice.resourceservice.dto.ResourceRequest;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.repository.ResourceCategoryRepository;
import com.microservice.resourceservice.repository.ResourceRepository;
import com.microservice.resourceservice.repository.UserBookmarkRepository;
import com.microservice.resourceservice.service.ResourceService;
import com.microservice.resourceservice.service.ai.AiResourceDraft;
import com.microservice.resourceservice.service.ai.StubAiResourceProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutoSeedService {

    private final ResourceRepository resourceRepository;
    private final ResourceCategoryRepository categoryRepository;
    private final UserBookmarkRepository bookmarkRepository;
    private final ResourceService resourceService;
    private final OllamaClient ollamaClient;
    private final ObjectMapper objectMapper;
    private final StubAiResourceProvider stubProvider;
    private final TransactionTemplate transactionTemplate;

    @Value("${ai.autoseed.enabled:true}")
    private boolean enabled;

    @Value("${ai.autoseed.category-count:18}")
    private int categoryCount;

    @Value("${ai.autoseed.resources-per-category:4}")
    private int resourcesPerCategory;

    private volatile SeedSummary lastSummary = null;

    @EventListener(ApplicationReadyEvent.class)
    public void seedOnStartup() {
        if (!enabled) {
            return;
        }

        if (resourceRepository.count() > 0) {
            return;
        }

        boolean ollamaAvailable = ollamaClient.isAvailable();
        try {
            SeedSummary summary = ollamaAvailable ? seedWithOllama(false) : seedStatic(false);
            this.lastSummary = summary;
            log.info("Auto seed completed. Provider={}, categoriesCreated={}, resourcesCreated={}",
                summary.provider(), summary.categoriesCreated(), summary.resourcesCreated());
        } catch (Exception e) {
            log.warn("Auto seed failed: {}", e.getMessage());
        }
    }

    public SeedSummary getLastSummary() {
        return lastSummary;
    }

    public SeedSummary seedAuto(boolean forceReseed) {
        boolean ollamaAvailable = ollamaClient.isAvailable();
        return ollamaAvailable ? seedWithOllama(forceReseed) : seedStatic(forceReseed);
    }

    public SeedSummary seedStatic(boolean forceReseed) {
        return doSeed(forceReseed, "static", false);
    }

    public SeedSummary seedWithOllama(boolean forceReseed) {
        return doSeed(forceReseed, "ollama", true);
    }

    protected SeedSummary doSeed(boolean forceReseed, String provider, boolean useOllama) {
        SeedSummary summary = transactionTemplate.execute(status -> {
            if (forceReseed) {
                bookmarkRepository.deleteAllInBatch();
                resourceRepository.deleteAllInBatch();
                categoryRepository.deleteAllInBatch();
            } else if (resourceRepository.count() > 0) {
                return new SeedSummary(provider, 0, 0, 0, List.of("DB already seeded; skipping"), LocalDateTime.now());
            }

            int categoriesCreated = 0;
            int resourcesCreated = 0;
            int skipped = 0;
            List<String> warnings = new ArrayList<>();

            if (categoryRepository.count() == 0) {
                List<CategoryDraft> drafts = useOllama ? generateCategoriesViaOllama() : staticCategoryDrafts();
                for (CategoryDraft d : drafts) {
                    try {
                        resourceService.createCategory(ResourceCategoryRequest.builder()
                            .name(d.name())
                            .description(d.description())
                            .industry(d.industry())
                            .build());
                        categoriesCreated++;
                    } catch (Exception e) {
                        warnings.add("Category skipped (" + d.name() + "): " + safeMessage(e));
                    }
                }
            }

            List<ResourceCategoryResponse> categories = resourceService.getAllCategories();
            int perCat = Math.max(1, resourcesPerCategory);

            for (ResourceCategoryResponse category : categories) {
                List<AiResourceDraft> drafts = useOllama
                    ? generateResourcesViaOllama(category, perCat)
                    : stubProvider.generate(toCategoryEntity(category), perCat, category.getIndustry(), null, null);

                for (AiResourceDraft draft : drafts) {
                    try {
                        ResourceRequest rr = toResourceRequest(draft, category.getId(), category.getIndustry());
                        rr.setUrl(ensureUniqueUrl(rr.getUrl()));
                        resourceService.createResource(rr);
                        resourcesCreated++;
                    } catch (Exception e) {
                        skipped++;
                        warnings.add("Resource skipped (" + safeTitle(draft) + "): " + safeMessage(e));
                    }
                }
            }

            return new SeedSummary(provider, categoriesCreated, resourcesCreated, skipped, warnings, LocalDateTime.now());
        });

        this.lastSummary = summary;
        return summary;
    }

    private List<CategoryDraft> generateCategoriesViaOllama() {
        int count = Math.max(1, categoryCount);
        String prompt = """
            Generate %d resource categories for a learning resource library.
            Output ONLY valid JSON (no markdown) as an array of objects with:
              - name (string, unique, non-empty, <= 40 chars)
              - description (string, 1 sentence)
              - industry (one of: TECHNOLOGY, FINANCE, HEALTHCARE, EDUCATION, MARKETING, ENGINEERING, LEGAL, CONSULTING, MEDIA, OTHER)
            """.formatted(count);

        String content = sanitizeJson(ollamaClient.generate(prompt));
        try {
            List<CategoryDraft> drafts = objectMapper.readValue(content, new TypeReference<List<CategoryDraft>>() {});
            return drafts.stream()
                .map(d -> new CategoryDraft(
                    normalizeCategoryName(d.name()),
                    d.description(),
                    d.industry() != null ? d.industry() : IndustryEnum.TECHNOLOGY
                ))
                .toList();
        } catch (Exception e) {
            log.warn("Failed to parse categories JSON from Ollama; falling back to static. Cause={}", e.getMessage());
            return staticCategoryDrafts();
        }
    }

    private List<AiResourceDraft> generateResourcesViaOllama(ResourceCategoryResponse category, int count) {
        String prompt = """
            Generate %d learning resources for category:
              - categoryName: %s
              - industry: %s

            Output ONLY valid JSON (no markdown) as an array with exactly %d objects.
            Each object fields:
              - title (string, non-empty)
              - description (string, 1-2 sentences)
              - url (string, MUST start with https:// and MUST NOT contain example.com)
              - type (one of: VIDEO, ARTICLE, PODCAST, QUIZ, BOOK)
              - level (one of: BEGINNER, INTERMEDIATE, ADVANCED)
              - industry (one of: TECHNOLOGY, FINANCE, HEALTHCARE, EDUCATION, MARKETING, ENGINEERING, LEGAL, CONSULTING, MEDIA, OTHER)
              - thumbUrl (string or null)
            """.formatted(count, category.getName(), category.getIndustry().name(), count);

        String content = sanitizeJson(ollamaClient.generate(prompt));
        try {
            List<AiResourceDraft> drafts = objectMapper.readValue(content, new TypeReference<List<AiResourceDraft>>() {});
            return drafts.stream()
                .map(d -> new AiResourceDraft(
                    nonBlank(d.title(), "Untitled"),
                    d.description(),
                    normalizeUrl(d.url(), d.title()),
                    d.type() != null ? d.type() : ResourceTypeEnum.ARTICLE,
                    d.level() != null ? d.level() : ResourceLevelEnum.BEGINNER,
                    d.industry() != null ? d.industry() : category.getIndustry(),
                    d.thumbUrl(),
                    category.getId()
                ))
                .toList();
        } catch (Exception e) {
            log.warn("Failed to parse resources JSON from Ollama for category={}; falling back to stub. Cause={}",
                category.getName(), e.getMessage());
            return stubProvider.generate(toCategoryEntity(category), count, category.getIndustry(), null, null);
        }
    }

    private static List<CategoryDraft> staticCategoryDrafts() {
        return List.of(
            new CategoryDraft("Backend Fundamentals", "Spring Boot, APIs, security, and persistence.", IndustryEnum.TECHNOLOGY),
            new CategoryDraft("Productivity & Career", "Practical habits for consistent professional growth.", IndustryEnum.OTHER),
            new CategoryDraft("Marketing Essentials", "Messaging, SEO, and campaign basics for growth.", IndustryEnum.MARKETING),
            new CategoryDraft("Finance Basics", "Budgeting, planning, and risk fundamentals.", IndustryEnum.FINANCE),
            new CategoryDraft("Education Skills", "Learning strategies and study techniques that work.", IndustryEnum.EDUCATION),
            new CategoryDraft("Engineering Practices", "Testing, architecture, and delivery discipline.", IndustryEnum.ENGINEERING),
            new CategoryDraft("Healthcare Overview", "Foundations of safety, privacy, and workflows.", IndustryEnum.HEALTHCARE),
            new CategoryDraft("Media & Storytelling", "Content creation, editing, and distribution.", IndustryEnum.MEDIA)
        );
    }

    private static com.microservice.resourceservice.model.ResourceCategory toCategoryEntity(ResourceCategoryResponse c) {
        return com.microservice.resourceservice.model.ResourceCategory.builder()
            .id(c.getId())
            .name(c.getName())
            .description(c.getDescription())
            .industry(c.getIndustry())
            .build();
    }

    private static ResourceRequest toResourceRequest(AiResourceDraft draft, UUID categoryId, IndustryEnum industry) {
        return ResourceRequest.builder()
            .title(nonBlank(draft.title(), "Untitled Resource"))
            .description(draft.description())
            .url(normalizeUrl(draft.url(), draft.title()))
            .type(draft.type() != null ? draft.type() : ResourceTypeEnum.ARTICLE)
            .level(draft.level() != null ? draft.level() : ResourceLevelEnum.BEGINNER)
            .industry(draft.industry() != null ? draft.industry() : industry)
            .thumbUrl(draft.thumbUrl())
            .categoryId(categoryId)
            .build();
    }

    private String ensureUniqueUrl(String url) {
        if (url == null || url.isBlank()) {
            return wikipediaUrl("resource");
        }
        String candidate = url.trim();
        int attempts = 0;
        while (resourceRepository.existsByUrl(candidate) && attempts < 5) {
            attempts++;
            String sep = candidate.contains("?") ? "&" : "?";
            candidate = candidate + sep + "v=" + UUID.randomUUID();
        }
        return candidate;
    }

    private static String normalizeUrl(String url, String title) {
        if (url == null) {
            return wikipediaUrl(title);
        }
        String trimmed = url.trim();
        if (trimmed.isBlank() || trimmed.toLowerCase(Locale.ROOT).contains("example.com") || !trimmed.startsWith("https://")) {
            return wikipediaUrl(title);
        }
        return trimmed;
    }

    private static String wikipediaUrl(String title) {
        String q = URLEncoder.encode(nonBlank(title, "resource"), StandardCharsets.UTF_8);
        return "https://en.wikipedia.org/wiki/Special:Search?search=" + q + "&id=" + UUID.randomUUID();
    }

    private static String nonBlank(String value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? fallback : trimmed;
    }

    private static String safeTitle(AiResourceDraft draft) {
        if (draft == null || draft.title() == null) {
            return "Untitled";
        }
        String t = draft.title().trim();
        return t.isBlank() ? "Untitled" : t;
    }

    private static String safeMessage(Exception e) {
        String m = e.getMessage();
        if (m == null || m.isBlank()) {
            return e.getClass().getSimpleName();
        }
        return m;
    }

    private static String normalizeCategoryName(String name) {
        String raw = nonBlank(name, "General");
        // avoid weird JSON-injection artifacts / too long
        String cleaned = raw.replaceAll("[\\r\\n\\t]", " ").trim();
        return cleaned.length() > 40 ? cleaned.substring(0, 40).trim() : cleaned;
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

    public record SeedSummary(
        String provider,
        int categoriesCreated,
        int resourcesCreated,
        int skipped,
        List<String> warnings,
        LocalDateTime seededAt
    ) { }

    private record CategoryDraft(String name, String description, IndustryEnum industry) { }
}
