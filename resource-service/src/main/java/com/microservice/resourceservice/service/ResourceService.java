package com.microservice.resourceservice.service;

import com.microservice.resourceservice.dto.ResourceCategoryRequest;
import com.microservice.resourceservice.dto.ResourceCategoryResponse;
import com.microservice.resourceservice.dto.ResourceRequest;
import com.microservice.resourceservice.dto.ResourceResponse;
import com.microservice.resourceservice.dto.ResourceStatsResponse;
import com.microservice.resourceservice.dto.UserBookmarkResponse;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.exception.BookmarkAlreadyExistsException;
import com.microservice.resourceservice.exception.CategoryNotFoundException;
import com.microservice.resourceservice.exception.ResourceNotFoundException;
import com.microservice.resourceservice.mapper.ResourceCategoryMapper;
import com.microservice.resourceservice.mapper.ResourceMapper;
import com.microservice.resourceservice.mapper.UserBookmarkMapper;
import com.microservice.resourceservice.messaging.event.ResourceEvent;
import com.microservice.resourceservice.messaging.producer.ResourceEventProducer;
import com.microservice.resourceservice.model.Resource;
import com.microservice.resourceservice.model.ResourceCategory;
import com.microservice.resourceservice.model.UserBookmark;
import com.microservice.resourceservice.repository.ResourceCategoryRepository;
import com.microservice.resourceservice.repository.ResourceRepository;
import com.microservice.resourceservice.repository.UserBookmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceCategoryRepository categoryRepository;
    private final UserBookmarkRepository bookmarkRepository;
    private final ResourceMapper resourceMapper;
    private final ResourceCategoryMapper categoryMapper;
    private final UserBookmarkMapper bookmarkMapper;
    private final ResourceEventProducer eventProducer;
    private final OgImageFetchService ogImageFetchService;

    @Transactional(readOnly = true)
    public Page<ResourceResponse> getAllResources(Pageable pageable) {
        return resourceRepository.findAll(pageable).map(resourceMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ResourceResponse getResourceById(UUID id) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        return resourceMapper.toResponse(resource);
    }

    @Transactional(readOnly = true)
    public Page<ResourceResponse> searchResources(String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return getAllResources(pageable);
        }
        String trimmed = query.trim();
        // The native FTS query already has ORDER BY ts_rank — strip the default sort from
        // pageable so Hibernate doesn't append a second ORDER BY clause (invalid SQL).
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<Resource> results = resourceRepository.searchFullText(trimmed, unsorted);
        if (results.isEmpty()) {
            results = resourceRepository.searchByTitleOrDescription(trimmed, pageable);
        }
        return results.map(resourceMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<ResourceResponse> filterResources(
            ResourceTypeEnum type, IndustryEnum industry, ResourceLevelEnum level, UUID categoryId, Pageable pageable) {
        if (type == null && industry == null && level == null && categoryId == null) {
            return getAllResources(pageable);
        }
        return resourceRepository.findFiltered(type, industry, level, categoryId, pageable)
            .map(resourceMapper::toResponse);
    }

    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public ResourceResponse createResource(ResourceRequest request) {
        if (resourceRepository.existsByUrl(request.getUrl())) {
            throw new IllegalArgumentException("Resource with URL already exists: " + request.getUrl());
        }

        ResourceCategory category = resolveCategoryOrDefault(request.getCategoryId(), request.getIndustry());

        Resource resource = resourceMapper.toEntity(request);
        resource.setCategory(category);
        Resource saved = resourceRepository.save(resource);

        // Async: fetch OG image if no thumbnail was supplied
        if (saved.getThumbUrl() == null || saved.getThumbUrl().isBlank()) {
            final UUID savedId = saved.getId();
            final String savedUrl = saved.getUrl();
            CompletableFuture.runAsync(() -> {
                ogImageFetchService.resolve(savedUrl).ifPresent(imgUrl -> {
                    resourceRepository.findById(savedId).ifPresent(r -> {
                        r.setThumbUrl(imgUrl);
                        resourceRepository.save(r);
                        log.info("Auto-set thumbUrl for resource {}: {}", savedId, imgUrl);
                    });
                });
            });
        }

        ResourceEvent event = ResourceEvent.builder()
            .eventId(UUID.randomUUID())
            .resourceId(saved.getId())
            .eventType("CREATED")
            .resourceTitle(saved.getTitle())
            .timestamp(LocalDateTime.now())
            .build();
        eventProducer.publishResourceCreated(event);

        return resourceMapper.toResponse(saved);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "ai-summary",   key = "#id.toString()"),
        @CacheEvict(value = "ai-quality",   key = "#id.toString()"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':fr'"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':en'"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':es'"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':ar'")
    })
    public ResourceResponse updateResource(UUID id, ResourceRequest request) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));

        ResourceCategory category = request.getCategoryId() != null
            ? resolveCategoryOrDefault(request.getCategoryId(), request.getIndustry())
            : resource.getCategory();

        if (!resource.getUrl().equals(request.getUrl()) && resourceRepository.existsByUrl(request.getUrl())) {
            throw new IllegalArgumentException("Resource with URL already exists: " + request.getUrl());
        }

        resource.setTitle(request.getTitle());
        resource.setDescription(request.getDescription());
        resource.setUrl(request.getUrl());
        resource.setType(request.getType());
        resource.setLevel(request.getLevel());
        resource.setIndustry(request.getIndustry());
        resource.setThumbUrl(request.getThumbUrl());
        resource.setCategory(category);

        ResourceResponse updated = resourceMapper.toResponse(resourceRepository.save(resource));

        ResourceEvent event = ResourceEvent.builder()
            .eventId(UUID.randomUUID())
            .resourceId(id)
            .eventType("UPDATED")
            .resourceTitle(resource.getTitle())
            .timestamp(LocalDateTime.now())
            .build();
        eventProducer.publishResourceUpdated(event);

        return updated;
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "ai-summary",   key = "#id.toString()"),
        @CacheEvict(value = "ai-quality",   key = "#id.toString()"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':fr'"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':en'"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':es'"),
        @CacheEvict(value = "ai-translate", key = "#id.toString() + ':ar'")
    })
    public void deleteResource(UUID id) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));

        resource.setDeletedAt(LocalDateTime.now());
        resourceRepository.save(resource);

        ResourceEvent event = ResourceEvent.builder()
            .eventId(UUID.randomUUID())
            .resourceId(id)
            .eventType("DELETED")
            .resourceTitle(resource.getTitle())
            .timestamp(LocalDateTime.now())
            .build();
        eventProducer.publishResourceDeleted(event);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "categories")
    public List<ResourceCategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream().map(categoryMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ResourceStatsResponse getStats() {
        return ResourceStatsResponse.builder()
            .totalCount(resourceRepository.count())
            .videoCount(resourceRepository.countByType(ResourceTypeEnum.VIDEO))
            .articleCount(resourceRepository.countByType(ResourceTypeEnum.ARTICLE))
            .podcastCount(resourceRepository.countByType(ResourceTypeEnum.PODCAST))
            .bookCount(resourceRepository.countByType(ResourceTypeEnum.BOOK))
            .quizCount(resourceRepository.countByType(ResourceTypeEnum.QUIZ))
            .categoryCount(categoryRepository.count())
            .newThisWeek(resourceRepository.countByCreatedAtAfter(java.time.LocalDateTime.now().minusDays(7)))
            .build();
    }

    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public ResourceCategoryResponse createCategory(ResourceCategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Category with name already exists: " + request.getName());
        }
        return categoryMapper.toResponse(categoryRepository.save(categoryMapper.toEntity(request)));
    }

    @Transactional
    public long incrementViewCount(UUID id) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        resource.setViewCount(resource.getViewCount() + 1);
        resourceRepository.save(resource);
        return resource.getViewCount();
    }

    /** Manually trigger OG image fetch for a resource. Used by admin endpoint. */
    @Transactional
    public ResourceResponse fetchAndUpdateThumb(UUID id) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        ogImageFetchService.resolve(resource.getUrl()).ifPresent(imgUrl -> {
            resource.setThumbUrl(imgUrl);
            resourceRepository.save(resource);
            log.info("Manually updated thumbUrl for resource {}: {}", id, imgUrl);
        });
        return resourceMapper.toResponse(resource);
    }

    @Transactional(readOnly = true)
    public List<UserBookmarkResponse> getUserBookmarks(UUID userId) {
        return bookmarkRepository.findByUserId(userId).stream().map(bookmarkMapper::toResponse).toList();
    }

    @Transactional
    public UserBookmarkResponse addBookmark(UUID userId, UUID resourceId) {
        if (bookmarkRepository.existsByUserIdAndResource_Id(userId, resourceId)) {
            throw new BookmarkAlreadyExistsException("Bookmark already exists for this resource");
        }

        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));

        UserBookmark bookmark = UserBookmark.builder()
            .userId(userId)
            .resource(resource)
            .build();

        return bookmarkMapper.toResponse(bookmarkRepository.save(bookmark));
    }

    @Transactional
    public void removeBookmark(UUID userId, UUID bookmarkId) {
        UserBookmark bookmark = bookmarkRepository.findById(bookmarkId)
            .orElseThrow(() -> new ResourceNotFoundException("Bookmark not found: " + bookmarkId));

        if (!bookmark.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Cannot delete another user's bookmark");
        }

        bookmarkRepository.delete(bookmark);
    }

    private ResourceCategory resolveCategoryOrDefault(UUID categoryId, IndustryEnum industry) {
        if (categoryId != null) {
            return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException("Category not found: " + categoryId));
        }

        String defaultName = "General";
        return categoryRepository.findByName(defaultName)
            .orElseGet(() -> {
                try {
                    ResourceCategory created = ResourceCategory.builder()
                        .name(defaultName)
                        .description("Default category")
                        .industry(industry != null ? industry : IndustryEnum.OTHER)
                        .build();
                    return categoryRepository.save(created);
                } catch (Exception e) {
                    // In case of race with unique constraint, try again.
                    return categoryRepository.findByName(defaultName)
                        .orElseThrow(() -> new IllegalStateException("Unable to resolve default category"));
                }
            });
    }
}
