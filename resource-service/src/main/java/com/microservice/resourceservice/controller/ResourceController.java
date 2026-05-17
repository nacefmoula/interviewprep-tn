package com.microservice.resourceservice.controller;

import com.microservice.resourceservice.dto.ResourceCategoryRequest;
import com.microservice.resourceservice.dto.ResourceCategoryResponse;
import com.microservice.resourceservice.dto.AiGenerateResourcesRequest;
import com.microservice.resourceservice.dto.AiGenerateResourcesResponse;
import com.microservice.resourceservice.dto.AiResourceSummaryResponse;
import com.microservice.resourceservice.dto.DuplicateCheckRequest;
import com.microservice.resourceservice.dto.FileUploadResponse;
import com.microservice.resourceservice.dto.ResourceRequest;
import com.microservice.resourceservice.dto.ResourceResponse;
import com.microservice.resourceservice.dto.ResourceStatsResponse;
import com.microservice.resourceservice.dto.UserBookmarkResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.security.ResourceAccessControlService;
import com.microservice.resourceservice.service.AiRelatedResourcesService;
import com.microservice.resourceservice.service.AiRelatedResourcesService.ScoredResource;
import com.microservice.resourceservice.service.AiResourceGenerationService;
import com.microservice.resourceservice.service.AiResourceSummaryService;
import com.microservice.resourceservice.service.AiClassifyService;
import com.microservice.resourceservice.service.AiQualityScoreService;
import com.microservice.resourceservice.service.AiTranslationService;
import com.microservice.resourceservice.service.ObjectStorageService;
import com.microservice.resourceservice.service.ResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@Tag(name = "Resources", description = "Resource library management — CRUD, search, AI features, bookmarks")
public class ResourceController {

    private final ResourceService resourceService;
    private final ResourceAccessControlService accessControlService;
    private final ObjectStorageService objectStorageService;
    private final AiResourceGenerationService aiResourceGenerationService;
    private final AiResourceSummaryService aiResourceSummaryService;
    private final AiRelatedResourcesService aiRelatedResourcesService;
    private final AiTranslationService aiTranslationService;
    private final AiQualityScoreService aiQualityScoreService;
    private final AiClassifyService aiClassifyService;

    @Operation(summary = "List all resources (paginated)", description = "Public. Default sort: createdAt DESC, page size 12, max 100.")
    @GetMapping
    public ResponseEntity<Page<ResourceResponse>> getAllResources(
        @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(resourceService.getAllResources(pageable));
    }

    @Operation(summary = "Get resource by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getResourceById(@PathVariable UUID id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    @Operation(summary = "Library statistics", description = "Returns aggregate counts: total, by type, categories, new this week.")
    @GetMapping("/stats")
    public ResponseEntity<ResourceStatsResponse> getStats() {
        return ResponseEntity.ok(resourceService.getStats());
    }

    @GetMapping("/{id}/ai/summary")
    public ResponseEntity<AiResourceSummaryResponse> summarizeResource(
        @PathVariable UUID id,
        @RequestParam(defaultValue = "false") boolean refresh
    ) {
        if (refresh) {
            aiResourceSummaryService.evictSummary(id);
        }
        return ResponseEntity.ok(aiResourceSummaryService.summarize(id));
    }

    @GetMapping("/{id}/ai/similar")
    public ResponseEntity<List<ResourceResponse>> similarResources(
        @PathVariable UUID id,
        @RequestParam(defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(aiRelatedResourcesService.findSimilar(id, limit));
    }

    /**
     * Checks whether a resource being composed (title+description) is a likely duplicate
     * of an existing one. Returns the top matches with a similarity score (0-100+).
     */
    @PostMapping("/ai/check-duplicate")
    public ResponseEntity<List<ScoredResource>> checkDuplicate(
        @Valid @RequestBody DuplicateCheckRequest request
    ) {
        String title = request != null ? request.getTitle() : null;
        String description = request != null ? request.getDescription() : null;
        return ResponseEntity.ok(aiRelatedResourcesService.findSimilarByText(title, description, 3));
    }

    /**
     * Translates a resource's title + description into the target language on demand.
     * Cached in Redis for 30 minutes per (id, lang) pair.
     */
    @GetMapping("/{id}/ai/translate")
    public ResponseEntity<AiTranslationService.Translation> translateResource(
        @PathVariable UUID id,
        @RequestParam(defaultValue = "en") String lang
    ) {
        return ResponseEntity.ok(aiTranslationService.translate(id, lang));
    }

    /**
     * Returns an AI quality score (0-5) across clarity, depth, usefulness.
     * Cached 30 minutes. Uses Ollama when configured, else heuristic.
     */
    @GetMapping("/{id}/ai/quality")
    public ResponseEntity<AiQualityScoreService.QualityScore> qualityScore(@PathVariable UUID id) {
        return ResponseEntity.ok(aiQualityScoreService.score(id));
    }

    /**
     * 1-click auto-classification: takes a title (and optional description hint) and
     * returns a complete classification — type, level, industry, category, description, tags.
     * Powers the "Tout remplir avec l'IA" button in the resource creation form.
     */
    @PostMapping("/ai/classify")
    public ResponseEntity<AiClassifyService.Classification> classifyResource(
        @Valid @RequestBody DuplicateCheckRequest request
    ) {
        String title = request != null ? request.getTitle() : null;
        String desc = request != null ? request.getDescription() : null;
        return ResponseEntity.ok(aiClassifyService.classify(title, desc));
    }

    /**
     * SSE streaming endpoint for the AI summary. Emits two event types:
     *  - "token" : incremental text chunks as the LLM produces them
     *  - "done"  : final full JSON (summary + keyPoints) when generation completes
     */
    @GetMapping(value = "/{id}/ai/summary/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamSummary(
        @PathVariable UUID id,
        @RequestParam(defaultValue = "false") boolean refresh
    ) {
        if (refresh) {
            aiResourceSummaryService.evictSummary(id);
        }
        return aiResourceSummaryService.streamSummary(id);
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<Void> incrementView(@PathVariable UUID id) {
        resourceService.incrementViewCount(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/fetch-thumb")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasAuthority('SCOPE_admin')")
    @Operation(summary = "Fetch and store OG image for a resource (admin)")
    public ResponseEntity<ResourceResponse> fetchThumb(@PathVariable UUID id) {
        return ResponseEntity.ok(resourceService.fetchAndUpdateThumb(id));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<ResourceResponse>> searchResources(
        @RequestParam String query,
        @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(resourceService.searchResources(query, pageable));
    }

    @GetMapping("/filter")
    public ResponseEntity<Page<ResourceResponse>> filterResources(
        @RequestParam(required = false) ResourceTypeEnum type,
        @RequestParam(required = false) IndustryEnum industry,
        @RequestParam(required = false) ResourceLevelEnum level,
        @RequestParam(required = false) UUID categoryId,
        @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(resourceService.filterResources(type, industry, level, categoryId, pageable));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ResourceResponse> createResource(
        @Valid @RequestBody ResourceRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.createResource(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ResourceResponse> updateResource(
        @PathVariable UUID id,
        @Valid @RequestBody ResourceRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        return ResponseEntity.ok(resourceService.updateResource(id, request));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FileUploadResponse> uploadResourceFile(
        @RequestPart("file") MultipartFile file,
        @RequestParam(defaultValue = "resource") String kind,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(objectStorageService.upload(file, kind));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteResource(
        @PathVariable UUID id,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories")
    public ResponseEntity<List<ResourceCategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(resourceService.getAllCategories());
    }

    @PostMapping("/categories")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ResourceCategoryResponse> createCategory(
        @Valid @RequestBody ResourceCategoryRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.createCategory(request));
    }

    @PostMapping("/ai/generate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiGenerateResourcesResponse> generateResourcesWithAi(
        @Valid @RequestBody AiGenerateResourcesRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(aiResourceGenerationService.generateAndInsert(request));
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<List<UserBookmarkResponse>> getBookmarks(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = resolveUserId(jwt);
        return ResponseEntity.ok(resourceService.getUserBookmarks(userId));
    }

    @PostMapping("/bookmarks/{id}")
    public ResponseEntity<UserBookmarkResponse> addBookmark(
        @PathVariable UUID id,
        @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = resolveUserId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.addBookmark(userId, id));
    }

    @DeleteMapping("/bookmarks/{id}")
    public ResponseEntity<Void> removeBookmark(
        @PathVariable UUID id,
        @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = resolveUserId(jwt);
        resourceService.removeBookmark(userId, id);
        return ResponseEntity.noContent().build();
    }

    private static UUID resolveUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new org.springframework.web.server.ResponseStatusException(BAD_REQUEST, "Missing JWT subject");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException e) {
            // Non-standard Keycloak subject — derive a stable v3 UUID from the raw string
            return UUID.nameUUIDFromBytes(jwt.getSubject().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
    }
}
