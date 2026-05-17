package com.microservice.resourceservice.controller;

import com.microservice.resourceservice.dto.ResourceCategoryResponse;
import com.microservice.resourceservice.dto.ResourceResponse;
import com.microservice.resourceservice.dto.ResourceStatsResponse;
import com.microservice.resourceservice.exception.ResourceNotFoundException;
import com.microservice.resourceservice.security.ResourceAccessControlService;
import com.microservice.resourceservice.service.AiClassifyService;
import com.microservice.resourceservice.service.AiQualityScoreService;
import com.microservice.resourceservice.service.AiRelatedResourcesService;
import com.microservice.resourceservice.service.AiResourceGenerationService;
import com.microservice.resourceservice.service.AiResourceSummaryService;
import com.microservice.resourceservice.service.AiTranslationService;
import com.microservice.resourceservice.service.ObjectStorageService;
import com.microservice.resourceservice.service.ResourceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResourceControllerTest {

    @Mock ResourceService resourceService;
    @Mock ResourceAccessControlService accessControlService;
    @Mock ObjectStorageService objectStorageService;
    @Mock AiResourceGenerationService aiResourceGenerationService;
    @Mock AiResourceSummaryService aiResourceSummaryService;
    @Mock AiRelatedResourcesService aiRelatedResourcesService;
    @Mock AiTranslationService aiTranslationService;
    @Mock AiQualityScoreService aiQualityScoreService;
    @Mock AiClassifyService aiClassifyService;

    @InjectMocks ResourceController controller;

    @Test
    void getAllResources_returns200WithPage() {
        Page<ResourceResponse> page = new PageImpl<>(List.of(new ResourceResponse()));
        when(resourceService.getAllResources(any())).thenReturn(page);
        ResponseEntity<Page<ResourceResponse>> response = controller.getAllResources(PageRequest.of(0, 12));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
    }

    @Test
    void getResourceById_returns200WhenFound() {
        UUID id = UUID.randomUUID();
        ResourceResponse dto = ResourceResponse.builder().id(id).title("Docker").build();
        when(resourceService.getResourceById(id)).thenReturn(dto);
        ResponseEntity<ResourceResponse> response = controller.getResourceById(id);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Docker", response.getBody().getTitle());
    }

    @Test
    void getResourceById_propagatesNotFoundException() {
        UUID id = UUID.randomUUID();
        when(resourceService.getResourceById(id)).thenThrow(new ResourceNotFoundException("not found"));
        assertThrows(ResourceNotFoundException.class, () -> controller.getResourceById(id));
    }

    @Test
    void getStats_returns200WithAllFields() {
        ResourceStatsResponse stats = ResourceStatsResponse.builder()
            .totalCount(50).videoCount(12).articleCount(25)
            .podcastCount(5).bookCount(4).quizCount(4)
            .categoryCount(10).newThisWeek(3)
            .build();
        when(resourceService.getStats()).thenReturn(stats);
        ResponseEntity<ResourceStatsResponse> response = controller.getStats();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(50, response.getBody().getTotalCount());
        assertEquals(12, response.getBody().getVideoCount());
        assertEquals(10, response.getBody().getCategoryCount());
    }

    @Test
    void searchResources_returns200() {
        Page<ResourceResponse> page = new PageImpl<>(List.of(new ResourceResponse()));
        when(resourceService.searchResources(any(), any())).thenReturn(page);
        ResponseEntity<Page<ResourceResponse>> response =
            controller.searchResources("docker", PageRequest.of(0, 10));
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getTotalElements());
    }

    @Test
    void filterResources_returns200() {
        when(resourceService.filterResources(any(), any(), any(), any(), any())).thenReturn(Page.empty());
        ResponseEntity<Page<ResourceResponse>> response =
            controller.filterResources(null, null, null, null, PageRequest.of(0, 10));
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void getCategories_returns200WithList() {
        when(resourceService.getAllCategories()).thenReturn(List.of(new ResourceCategoryResponse()));
        ResponseEntity<List<ResourceCategoryResponse>> response = controller.getAllCategories();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getStats_returnsNewThisWeek() {
        ResourceStatsResponse stats = ResourceStatsResponse.builder()
            .totalCount(5).newThisWeek(5).build();
        when(resourceService.getStats()).thenReturn(stats);
        ResponseEntity<ResourceStatsResponse> response = controller.getStats();
        assertEquals(5, response.getBody().getNewThisWeek());
    }

    @Test
    void getSummary_returns200WhenFound() {
        UUID id = UUID.randomUUID();
        var summary = com.microservice.resourceservice.dto.AiResourceSummaryResponse.builder()
            .resourceId(id).provider("stub").summary("Great resource").build();
        when(aiResourceSummaryService.summarize(id)).thenReturn(summary);
        ResponseEntity<com.microservice.resourceservice.dto.AiResourceSummaryResponse> response =
            controller.summarizeResource(id, false);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("stub", response.getBody().getProvider());
    }
}
