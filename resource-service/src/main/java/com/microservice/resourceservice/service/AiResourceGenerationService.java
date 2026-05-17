package com.microservice.resourceservice.service;

import com.microservice.resourceservice.config.AiGenerationProperties;
import com.microservice.resourceservice.dto.AiGenerateResourcesRequest;
import com.microservice.resourceservice.dto.AiGenerateResourcesResponse;
import com.microservice.resourceservice.dto.ResourceRequest;
import com.microservice.resourceservice.dto.ResourceResponse;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.exception.CategoryNotFoundException;
import com.microservice.resourceservice.model.ResourceCategory;
import com.microservice.resourceservice.repository.ResourceCategoryRepository;
import com.microservice.resourceservice.repository.ResourceRepository;
import com.microservice.resourceservice.service.ai.AiResourceDraft;
import com.microservice.resourceservice.service.ai.AiResourceProvider;
import com.microservice.resourceservice.service.ai.OpenAiChatCompletionsResourceProvider;
import com.microservice.resourceservice.service.ai.OllamaAiResourceProvider;
import com.microservice.resourceservice.service.ai.StubAiResourceProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class AiResourceGenerationService {

    private final AiGenerationProperties props;
    private final ResourceCategoryRepository categoryRepository;
    private final ResourceRepository resourceRepository;
    private final ResourceService resourceService;
    private final StubAiResourceProvider stubProvider;
    private final OllamaAiResourceProvider ollamaProvider;
    private final OpenAiChatCompletionsResourceProvider openAiProvider;
    private final ThreadPoolTaskExecutor aiTaskExecutor;

    public AiResourceGenerationService(
        AiGenerationProperties props,
        ResourceCategoryRepository categoryRepository,
        ResourceRepository resourceRepository,
        ResourceService resourceService,
        StubAiResourceProvider stubProvider,
        OllamaAiResourceProvider ollamaProvider,
        OpenAiChatCompletionsResourceProvider openAiProvider,
        @Qualifier("aiTaskExecutor") ThreadPoolTaskExecutor aiTaskExecutor
    ) {
        this.props = props;
        this.categoryRepository = categoryRepository;
        this.resourceRepository = resourceRepository;
        this.resourceService = resourceService;
        this.stubProvider = stubProvider;
        this.ollamaProvider = ollamaProvider;
        this.openAiProvider = openAiProvider;
        this.aiTaskExecutor = aiTaskExecutor;
    }

    public AiGenerateResourcesResponse generateAndInsert(AiGenerateResourcesRequest request) {
        int requested = resolveCount(request);
        ResourceCategory fixedCategory = resolveFixedCategory(request);
        List<ResourceCategory> categories = resolveCandidateCategories(request, fixedCategory);

        if (categories.isEmpty()) {
            throw new CategoryNotFoundException("No categories available for AI generation");
        }

        Map<ResourceCategory, Integer> perCategoryCounts = distributeCounts(categories, requested);

        AiResourceProvider provider = resolveProvider();
        IndustryEnum industry = request != null ? request.getIndustry() : null;
        ResourceLevelEnum level = request != null ? request.getLevel() : null;
        ResourceTypeEnum type = request != null ? request.getType() : null;

        final AiResourceProvider providerRef = provider;
        final IndustryEnum industryRef = industry;
        final ResourceLevelEnum levelRef = level;
        final ResourceTypeEnum typeRef = type;

        List<CompletableFuture<CategoryDrafts>> futures = new ArrayList<>();
        for (Map.Entry<ResourceCategory, Integer> entry : perCategoryCounts.entrySet()) {
            final ResourceCategory category = entry.getKey();
            final int count = entry.getValue();
            futures.add(CompletableFuture.supplyAsync(() -> {
                List<String> localWarnings = new ArrayList<>();
                List<AiResourceDraft> drafts;
                try {
                    drafts = providerRef.generate(category, count, industryRef, levelRef, typeRef);
                } catch (Exception e) {
                    if (props.isFallbackToStub() && !(providerRef instanceof StubAiResourceProvider)) {
                        log.warn("AI provider failed ({}). Falling back to stub for '{}'. Cause: {}",
                            providerRef.getClass().getSimpleName(), category.getName(), e.getMessage());
                        localWarnings.add("AI provider failed; used stub generator for category: " + category.getName());
                        drafts = stubProvider.generate(category, count, industryRef, levelRef, typeRef);
                    } else {
                        throw e;
                    }
                }
                return new CategoryDrafts(category, drafts, localWarnings);
            }, aiTaskExecutor));
        }

        // Gather all results. CompletableFuture.allOf lets us wait once for everything.
        List<ResourceResponse> created = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int skipped = 0;

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        // DB inserts are kept sequential to preserve transactional ordering + avoid pool contention.
        for (CompletableFuture<CategoryDrafts> f : futures) {
            CategoryDrafts cd = f.join();
            warnings.addAll(cd.warnings());
            for (AiResourceDraft draft : cd.drafts()) {
                try {
                    ResourceRequest rr = toResourceRequest(draft);
                    rr.setUrl(ensureUniqueUrl(rr.getUrl()));
                    ResourceResponse saved = resourceService.createResource(rr);
                    created.add(saved);
                } catch (Exception e) {
                    skipped += 1;
                    warnings.add("Skipped one draft (" + safeTitle(draft) + "): " + safeMessage(e));
                }
            }
        }

        return AiGenerateResourcesResponse.builder()
            .requested(requested)
            .created(created.size())
            .skipped(skipped)
            .resources(created)
            .warnings(warnings)
            .build();
    }

    private record CategoryDrafts(ResourceCategory category, List<AiResourceDraft> drafts, List<String> warnings) {}

    private int resolveCount(AiGenerateResourcesRequest request) {
        if (request == null || request.getCount() == null) {
            return Math.max(1, props.getDefaultCount());
        }
        return request.getCount();
    }

    private ResourceCategory resolveFixedCategory(AiGenerateResourcesRequest request) {
        if (request == null || request.getCategoryId() == null) {
            return null;
        }
        UUID id = request.getCategoryId();
        return categoryRepository.findById(id)
            .orElseThrow(() -> new CategoryNotFoundException("Category not found: " + id));
    }

    private List<ResourceCategory> resolveCandidateCategories(AiGenerateResourcesRequest request, ResourceCategory fixedCategory) {
        if (fixedCategory != null) {
            return List.of(fixedCategory);
        }

        IndustryEnum industry = request != null ? request.getIndustry() : null;
        if (industry != null) {
            return categoryRepository.findByIndustry(industry);
        }
        return categoryRepository.findAll();
    }

    private static Map<ResourceCategory, Integer> distributeCounts(List<ResourceCategory> categories, int requested) {
        Map<ResourceCategory, Integer> map = new LinkedHashMap<>();
        for (int i = 0; i < requested; i++) {
            ResourceCategory category = categories.get(i % categories.size());
            map.merge(category, 1, Integer::sum);
        }
        return map;
    }

    private AiResourceProvider resolveProvider() {
        String configured = props.getProvider() == null ? "stub" : props.getProvider().trim().toLowerCase(Locale.ROOT);
        return switch (configured) {
            case "ollama" -> ollamaProvider;
            case "openai" -> openAiProvider;
            case "stub" -> stubProvider;
            default -> stubProvider;
        };
    }

    private ResourceRequest toResourceRequest(AiResourceDraft draft) {
        return ResourceRequest.builder()
            .title(nonBlank(draft.title(), "Untitled Resource"))
            .description(draft.description())
            .url(nonBlank(draft.url(), "https://en.wikipedia.org/wiki/Special:Search?search=resource&id=" + UUID.randomUUID()))
            .type(draft.type())
            .level(draft.level())
            .industry(draft.industry())
            .thumbUrl(draft.thumbUrl())
            .categoryId(draft.categoryId())
            .build();
    }

    private String ensureUniqueUrl(String url) {
        if (url == null || url.isBlank()) {
            return "https://en.wikipedia.org/wiki/Special:Search?search=resource&id=" + UUID.randomUUID();
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
}
