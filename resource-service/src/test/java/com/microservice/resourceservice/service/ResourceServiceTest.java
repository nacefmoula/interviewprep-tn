package com.microservice.resourceservice.service;

import com.microservice.resourceservice.dto.ResourceCategoryRequest;
import com.microservice.resourceservice.dto.ResourceCategoryResponse;
import com.microservice.resourceservice.dto.ResourceRequest;
import com.microservice.resourceservice.dto.ResourceResponse;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.exception.BookmarkAlreadyExistsException;
import com.microservice.resourceservice.exception.ResourceNotFoundException;
import com.microservice.resourceservice.mapper.ResourceCategoryMapper;
import com.microservice.resourceservice.mapper.ResourceMapper;
import com.microservice.resourceservice.mapper.UserBookmarkMapper;
import com.microservice.resourceservice.messaging.producer.ResourceEventProducer;
import com.microservice.resourceservice.model.Resource;
import com.microservice.resourceservice.model.ResourceCategory;
import com.microservice.resourceservice.model.UserBookmark;
import com.microservice.resourceservice.repository.ResourceCategoryRepository;
import com.microservice.resourceservice.repository.ResourceRepository;
import com.microservice.resourceservice.repository.UserBookmarkRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock ResourceRepository resourceRepository;
    @Mock ResourceCategoryRepository categoryRepository;
    @Mock UserBookmarkRepository bookmarkRepository;
    @Mock ResourceMapper resourceMapper;
    @Mock ResourceCategoryMapper categoryMapper;
    @Mock UserBookmarkMapper bookmarkMapper;
    @Mock ResourceEventProducer eventProducer;

    @InjectMocks ResourceService resourceService;

    // ── getResourceById ───────────────────────────────────────────────────────

    @Test
    void getResourceById_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> resourceService.getResourceById(id));
    }

    @Test
    void getResourceById_returnsResponseWhenFound() {
        UUID id = UUID.randomUUID();
        Resource resource = new Resource();
        ResourceResponse response = new ResourceResponse();
        when(resourceRepository.findById(id)).thenReturn(Optional.of(resource));
        when(resourceMapper.toResponse(resource)).thenReturn(response);
        assertEquals(response, resourceService.getResourceById(id));
    }

    // ── searchResources ───────────────────────────────────────────────────────

    @Test
    void searchResources_returnsAllWhenQueryIsBlank() {
        Pageable pageable = PageRequest.of(0, 10);
        when(resourceRepository.findAll(pageable)).thenReturn(Page.empty());
        resourceService.searchResources("   ", pageable);
        verify(resourceRepository).findAll(pageable);
        verify(resourceRepository, never()).searchFullText(any(), any());
    }

    @Test
    void searchResources_usesFtsWhenQueryProvided() {
        Pageable pageable = PageRequest.of(0, 10);
        Resource resource = new Resource();
        Page<Resource> ftsPage = new PageImpl<>(List.of(resource));
        when(resourceRepository.searchFullText("spring", pageable)).thenReturn(ftsPage);
        when(resourceMapper.toResponse(resource)).thenReturn(new ResourceResponse());
        Page<ResourceResponse> result = resourceService.searchResources("spring", pageable);
        assertEquals(1, result.getTotalElements());
        verify(resourceRepository).searchFullText("spring", pageable);
    }

    @Test
    void searchResources_fallsBackToLikeWhenFtsEmpty() {
        Pageable pageable = PageRequest.of(0, 10);
        Resource resource = new Resource();
        when(resourceRepository.searchFullText("spring", pageable)).thenReturn(Page.empty());
        when(resourceRepository.searchByTitleOrDescription("spring", pageable))
            .thenReturn(new PageImpl<>(List.of(resource)));
        when(resourceMapper.toResponse(resource)).thenReturn(new ResourceResponse());
        Page<ResourceResponse> result = resourceService.searchResources("spring", pageable);
        assertEquals(1, result.getTotalElements());
        verify(resourceRepository).searchByTitleOrDescription("spring", pageable);
    }

    // ── filterResources ───────────────────────────────────────────────────────

    @Test
    void filterResources_byTypeAndLevel() {
        Pageable pageable = PageRequest.of(0, 10);
        when(resourceRepository.findFiltered(ResourceTypeEnum.VIDEO, null, ResourceLevelEnum.BEGINNER, null, pageable))
            .thenReturn(Page.empty());
        resourceService.filterResources(ResourceTypeEnum.VIDEO, null, ResourceLevelEnum.BEGINNER, null, pageable);
        verify(resourceRepository).findFiltered(ResourceTypeEnum.VIDEO, null, ResourceLevelEnum.BEGINNER, null, pageable);
    }

    @Test
    void filterResources_byTypeOnly() {
        Pageable pageable = PageRequest.of(0, 10);
        when(resourceRepository.findFiltered(ResourceTypeEnum.ARTICLE, null, null, null, pageable)).thenReturn(Page.empty());
        resourceService.filterResources(ResourceTypeEnum.ARTICLE, null, null, null, pageable);
        verify(resourceRepository).findFiltered(ResourceTypeEnum.ARTICLE, null, null, null, pageable);
    }

    @Test
    void filterResources_byLevelOnly() {
        Pageable pageable = PageRequest.of(0, 10);
        when(resourceRepository.findFiltered(null, null, ResourceLevelEnum.ADVANCED, null, pageable)).thenReturn(Page.empty());
        resourceService.filterResources(null, null, ResourceLevelEnum.ADVANCED, null, pageable);
        verify(resourceRepository).findFiltered(null, null, ResourceLevelEnum.ADVANCED, null, pageable);
    }

    @Test
    void filterResources_noFiltersCallsGetAll() {
        Pageable pageable = PageRequest.of(0, 10);
        when(resourceRepository.findAll(pageable)).thenReturn(Page.empty());
        resourceService.filterResources(null, null, null, null, pageable);
        verify(resourceRepository).findAll(pageable);
    }

    // ── createResource ────────────────────────────────────────────────────────

    @Test
    void createResource_throwsWhenUrlExists() {
        ResourceRequest request = new ResourceRequest();
        request.setUrl("https://example.com");
        request.setCategoryId(UUID.randomUUID());
        when(resourceRepository.existsByUrl(request.getUrl())).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> resourceService.createResource(request));
        verify(resourceRepository, never()).save(any());
    }

    @Test
    void createResource_throwsWhenCategoryNotFound() {
        UUID categoryId = UUID.randomUUID();
        ResourceRequest request = new ResourceRequest();
        request.setUrl("https://example.com");
        request.setCategoryId(categoryId);
        request.setIndustry(IndustryEnum.TECHNOLOGY);
        when(resourceRepository.existsByUrl(request.getUrl())).thenReturn(false);
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());
        assertThrows(Exception.class, () -> resourceService.createResource(request));
    }

    @Test
    void createResource_savesAndPublishesEvent() {
        UUID categoryId = UUID.randomUUID();
        ResourceCategory category = new ResourceCategory();
        category.setId(categoryId);
        Resource saved = new Resource();
        saved.setId(UUID.randomUUID());
        saved.setTitle("Test");

        ResourceRequest request = new ResourceRequest();
        request.setUrl("https://example.com");
        request.setCategoryId(categoryId);
        request.setTitle("Test");
        request.setType(ResourceTypeEnum.ARTICLE);
        request.setLevel(ResourceLevelEnum.BEGINNER);
        request.setIndustry(IndustryEnum.TECHNOLOGY);

        when(resourceRepository.existsByUrl(any())).thenReturn(false);
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(resourceMapper.toEntity(request)).thenReturn(saved);
        when(resourceRepository.save(saved)).thenReturn(saved);
        when(resourceMapper.toResponse(saved)).thenReturn(new ResourceResponse());

        assertDoesNotThrow(() -> resourceService.createResource(request));
        verify(resourceRepository).save(saved);
        verify(eventProducer).publishResourceCreated(any());
    }

    // ── updateResource ────────────────────────────────────────────────────────

    @Test
    void updateResource_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> resourceService.updateResource(id, new ResourceRequest()));
    }

    @Test
    void updateResource_throwsWhenUrlTakenByAnother() {
        UUID id = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        Resource existing = new Resource();
        existing.setUrl("https://old.com");
        ResourceCategory category = new ResourceCategory();
        category.setId(categoryId);
        existing.setCategory(category);

        ResourceRequest request = new ResourceRequest();
        request.setUrl("https://new.com");
        request.setCategoryId(categoryId);

        when(resourceRepository.findById(id)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(resourceRepository.existsByUrl("https://new.com")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> resourceService.updateResource(id, request));
    }

    @Test
    void updateResource_savesAndPublishesUpdatedEvent() {
        UUID id = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        ResourceCategory category = new ResourceCategory();
        category.setId(categoryId);
        Resource existing = new Resource();
        existing.setId(id);
        existing.setUrl("https://same.com");
        existing.setTitle("Old");
        existing.setCategory(category);

        ResourceRequest request = new ResourceRequest();
        request.setUrl("https://same.com");
        request.setCategoryId(categoryId);
        request.setTitle("New");
        request.setType(ResourceTypeEnum.VIDEO);
        request.setLevel(ResourceLevelEnum.INTERMEDIATE);
        request.setIndustry(IndustryEnum.TECHNOLOGY);

        when(resourceRepository.findById(id)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(resourceRepository.save(existing)).thenReturn(existing);
        when(resourceMapper.toResponse(existing)).thenReturn(new ResourceResponse());

        assertDoesNotThrow(() -> resourceService.updateResource(id, request));
        verify(resourceRepository).save(existing);
        verify(eventProducer).publishResourceUpdated(any());
    }

    // ── deleteResource ────────────────────────────────────────────────────────

    @Test
    void deleteResource_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> resourceService.deleteResource(id));
    }

    @Test
    void deleteResource_softDeletesAndPublishesEvent() {
        UUID id = UUID.randomUUID();
        Resource resource = new Resource();
        resource.setId(id);
        resource.setTitle("To delete");
        when(resourceRepository.findById(id)).thenReturn(Optional.of(resource));
        when(resourceRepository.save(resource)).thenReturn(resource);

        assertDoesNotThrow(() -> resourceService.deleteResource(id));
        assertNotNull(resource.getDeletedAt(), "deletedAt must be set after soft-delete");
        verify(resourceRepository).save(resource);
        verify(resourceRepository, never()).delete(any());
        verify(eventProducer).publishResourceDeleted(any());
    }

    // ── categories ────────────────────────────────────────────────────────────

    @Test
    void getAllCategories_returnsMappedList() {
        ResourceCategory cat = new ResourceCategory();
        when(categoryRepository.findAll()).thenReturn(List.of(cat));
        when(categoryMapper.toResponse(cat)).thenReturn(new ResourceCategoryResponse());
        List<ResourceCategoryResponse> result = resourceService.getAllCategories();
        assertEquals(1, result.size());
    }

    @Test
    void createCategory_throwsWhenNameExists() {
        ResourceCategoryRequest request = new ResourceCategoryRequest();
        request.setName("Java");
        when(categoryRepository.existsByName("Java")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> resourceService.createCategory(request));
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void createCategory_savesAndReturnsResponse() {
        ResourceCategoryRequest request = new ResourceCategoryRequest();
        request.setName("Java");
        ResourceCategory entity = new ResourceCategory();
        when(categoryRepository.existsByName("Java")).thenReturn(false);
        when(categoryMapper.toEntity(request)).thenReturn(entity);
        when(categoryRepository.save(entity)).thenReturn(entity);
        when(categoryMapper.toResponse(entity)).thenReturn(new ResourceCategoryResponse());
        assertDoesNotThrow(() -> resourceService.createCategory(request));
        verify(categoryRepository).save(entity);
    }

    // ── bookmarks ─────────────────────────────────────────────────────────────

    @Test
    void addBookmark_throwsWhenAlreadyExists() {
        UUID userId = UUID.randomUUID();
        UUID resourceId = UUID.randomUUID();
        when(bookmarkRepository.existsByUserIdAndResource_Id(userId, resourceId)).thenReturn(true);
        assertThrows(BookmarkAlreadyExistsException.class, () -> resourceService.addBookmark(userId, resourceId));
        verify(bookmarkRepository, never()).save(any());
    }

    @Test
    void addBookmark_throwsWhenResourceNotFound() {
        UUID userId = UUID.randomUUID();
        UUID resourceId = UUID.randomUUID();
        when(bookmarkRepository.existsByUserIdAndResource_Id(userId, resourceId)).thenReturn(false);
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> resourceService.addBookmark(userId, resourceId));
    }

    @Test
    void addBookmark_savesBookmarkWhenValid() {
        UUID userId = UUID.randomUUID();
        UUID resourceId = UUID.randomUUID();
        Resource resource = new Resource();
        resource.setId(resourceId);
        when(bookmarkRepository.existsByUserIdAndResource_Id(userId, resourceId)).thenReturn(false);
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
        when(bookmarkRepository.save(any())).thenReturn(new UserBookmark());
        when(bookmarkMapper.toResponse(any())).thenReturn(null);
        assertDoesNotThrow(() -> resourceService.addBookmark(userId, resourceId));
        verify(bookmarkRepository).save(any());
    }

    @Test
    void getUserBookmarks_delegatesToRepository() {
        UUID userId = UUID.randomUUID();
        when(bookmarkRepository.findByUserId(userId)).thenReturn(List.of());
        List<?> result = resourceService.getUserBookmarks(userId);
        assertTrue(result.isEmpty());
        verify(bookmarkRepository).findByUserId(userId);
    }

    @Test
    void removeBookmark_throwsWhenNotOwner() {
        UUID userId = UUID.randomUUID();
        UUID bookmarkId = UUID.randomUUID();
        UserBookmark bookmark = new UserBookmark();
        bookmark.setUserId(UUID.randomUUID());
        when(bookmarkRepository.findById(bookmarkId)).thenReturn(Optional.of(bookmark));
        assertThrows(IllegalArgumentException.class, () -> resourceService.removeBookmark(userId, bookmarkId));
        verify(bookmarkRepository, never()).delete(any());
    }

    @Test
    void removeBookmark_succeedsForOwner() {
        UUID userId = UUID.randomUUID();
        UUID bookmarkId = UUID.randomUUID();
        UserBookmark bookmark = new UserBookmark();
        bookmark.setUserId(userId);
        when(bookmarkRepository.findById(bookmarkId)).thenReturn(Optional.of(bookmark));
        assertDoesNotThrow(() -> resourceService.removeBookmark(userId, bookmarkId));
        verify(bookmarkRepository).delete(bookmark);
    }

    @Test
    void removeBookmark_throwsWhenNotFound() {
        UUID userId = UUID.randomUUID();
        UUID bookmarkId = UUID.randomUUID();
        when(bookmarkRepository.findById(bookmarkId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> resourceService.removeBookmark(userId, bookmarkId));
    }
}
