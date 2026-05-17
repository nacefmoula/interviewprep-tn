package com.microservice.resourceservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.resourceservice.dto.ResourceRequest;
import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.messaging.producer.ResourceEventProducer;
import com.microservice.resourceservice.model.Resource;
import com.microservice.resourceservice.model.ResourceCategory;
import com.microservice.resourceservice.repository.ResourceCategoryRepository;
import com.microservice.resourceservice.repository.ResourceRepository;
import com.microservice.resourceservice.repository.UserBookmarkRepository;
import com.microservice.resourceservice.security.ResourceAccessControlService;
import com.microservice.resourceservice.service.AiClassifyService;
import com.microservice.resourceservice.service.AiQualityScoreService;
import com.microservice.resourceservice.service.AiRelatedResourcesService;
import com.microservice.resourceservice.service.AiResourceGenerationService;
import com.microservice.resourceservice.service.AiResourceSummaryService;
import com.microservice.resourceservice.service.AiTranslationService;
import com.microservice.resourceservice.service.ObjectStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import jakarta.persistence.EntityManager;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
@Transactional
class ResourceIntegrationTest extends AbstractPostgresIntegrationTest {

    // ── Mocked external dependencies ─────────────────────────────────────────

    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean RedisConnectionFactory redisConnectionFactory;
    @MockitoBean ResourceEventProducer resourceEventProducer;
    @MockitoBean ResourceAccessControlService accessControlService;
    @MockitoBean AiResourceSummaryService aiResourceSummaryService;
    @MockitoBean AiRelatedResourcesService aiRelatedResourcesService;
    @MockitoBean AiTranslationService aiTranslationService;
    @MockitoBean AiQualityScoreService aiQualityScoreService;
    @MockitoBean AiClassifyService aiClassifyService;
    @MockitoBean AiResourceGenerationService aiResourceGenerationService;
    @MockitoBean ObjectStorageService objectStorageService;

    // ── Spring beans ──────────────────────────────────────────────────────────

    @Autowired WebApplicationContext context;
    @Autowired ResourceRepository resourceRepository;
    @Autowired ResourceCategoryRepository categoryRepository;
    @Autowired UserBookmarkRepository bookmarkRepository;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired EntityManager entityManager;

    // ── Test fixtures ─────────────────────────────────────────────────────────

    MockMvc mockMvc;
    ResourceCategory cat;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
            .apply(springSecurity())
            .build();

        // Bypass @SQLRestriction on soft-deleted rows with raw SQL to guarantee a
        // clean slate even when previous tests left soft-deleted rows behind.
        jdbcTemplate.execute("DELETE FROM user_bookmarks");
        jdbcTemplate.execute("DELETE FROM resources");
        jdbcTemplate.execute("DELETE FROM resource_categories");

        cat = categoryRepository.save(ResourceCategory.builder()
            .name("Technology")
            .description("Tech resources")
            .industry(IndustryEnum.TECHNOLOGY)
            .build());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Resource save(String title, String url) {
        return resourceRepository.save(Resource.builder()
            .title(title)
            .description("About " + title)
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.BEGINNER)
            .industry(IndustryEnum.TECHNOLOGY)
            .url(url)
            .category(cat)
            .build());
    }

    private String validJson(String title, String url) throws Exception {
        return objectMapper.writeValueAsString(ResourceRequest.builder()
            .title(title)
            .description("A description")
            .url(url)
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.BEGINNER)
            .industry(IndustryEnum.TECHNOLOGY)
            .categoryId(cat.getId())
            .build());
    }

    // ── List resources ────────────────────────────────────────────────────────

    @Test
    void listResources_emptyDb_returns200WithEmptyPage() throws Exception {
        mockMvc.perform(get("/api/resources"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(0))
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void listResources_withData_returns200Page() throws Exception {
        save("Spring Boot Essentials", "https://spring.io/guides");
        save("Docker Deep Dive", "https://docker.com/guides");
        save("Kubernetes Basics", "https://kubernetes.io/docs");

        mockMvc.perform(get("/api/resources"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(3))
            .andExpect(jsonPath("$.content", hasSize(3)));
    }

    @Test
    void listResources_pagination_secondPageHasCorrectSize() throws Exception {
        for (int i = 1; i <= 5; i++) {
            save("Resource " + i, "https://example.com/r" + i);
        }

        mockMvc.perform(get("/api/resources?page=1&size=3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(2)));
    }

    @Test
    void listResources_pageSizeCappedAt100() throws Exception {
        save("Any Resource", "https://example.com/any");

        mockMvc.perform(get("/api/resources?size=999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.size").value(100));
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────

    @Test
    void getById_found_returns200WithTitle() throws Exception {
        Resource r = save("Spring Boot Guide", "https://spring.io/boot");

        mockMvc.perform(get("/api/resources/{id}", r.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(r.getId().toString()))
            .andExpect(jsonPath("$.title").value("Spring Boot Guide"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        mockMvc.perform(get("/api/resources/{id}", UUID.randomUUID()))
            .andExpect(status().isNotFound());
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    @Test
    void getStats_emptyDb_returnsAllZeros() throws Exception {
        mockMvc.perform(get("/api/resources/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(0))
            .andExpect(jsonPath("$.categoryCount").value(1))
            .andExpect(jsonPath("$.videoCount").value(0));
    }

    @Test
    void getStats_withMixedTypes_returnsCorrectCounts() throws Exception {
        save("Article One", "https://example.com/a1");
        save("Article Two", "https://example.com/a2");
        resourceRepository.save(Resource.builder()
            .title("Video One")
            .url("https://example.com/v1")
            .type(ResourceTypeEnum.VIDEO)
            .level(ResourceLevelEnum.INTERMEDIATE)
            .industry(IndustryEnum.TECHNOLOGY)
            .category(cat)
            .build());

        mockMvc.perform(get("/api/resources/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(3))
            .andExpect(jsonPath("$.articleCount").value(2))
            .andExpect(jsonPath("$.videoCount").value(1))
            .andExpect(jsonPath("$.newThisWeek").value(3));
    }

    // ── Search ────────────────────────────────────────────────────────────────

    @Test
    void search_ftsMatch_returns200WithResult() throws Exception {
        save("Spring Boot Microservices", "https://spring.io/microservices");
        save("Docker Containers", "https://docker.com/containers");
        resourceRepository.flush();

        mockMvc.perform(get("/api/resources/search?query=spring"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(greaterThan(0))))
            .andExpect(jsonPath("$.content[0].title", containsStringIgnoringCase("spring")));
    }

    @Test
    void search_noMatch_returnsEmptyPage() throws Exception {
        save("Spring Boot Guide", "https://spring.io/guide");
        resourceRepository.flush();

        mockMvc.perform(get("/api/resources/search?query=xyznomatchxyz"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void search_blankQuery_returnsAll() throws Exception {
        save("Any Resource", "https://example.com/any");

        mockMvc.perform(get("/api/resources/search?query="))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1));
    }

    // ── Filter ────────────────────────────────────────────────────────────────

    @Test
    void filter_byLevel_returnsOnlyMatching() throws Exception {
        save("Beginner Guide", "https://example.com/beginner");
        resourceRepository.save(Resource.builder()
            .title("Advanced Course")
            .url("https://example.com/advanced")
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.ADVANCED)
            .industry(IndustryEnum.TECHNOLOGY)
            .category(cat)
            .build());

        mockMvc.perform(get("/api/resources/filter?level=BEGINNER"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].level").value("BEGINNER"));
    }

    @Test
    void filter_byIndustry_returnsOnlyMatching() throws Exception {
        save("Tech Article", "https://example.com/tech");
        resourceRepository.save(Resource.builder()
            .title("Finance Report")
            .url("https://example.com/finance")
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.BEGINNER)
            .industry(IndustryEnum.FINANCE)
            .category(cat)
            .build());

        mockMvc.perform(get("/api/resources/filter?industry=TECHNOLOGY"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].industry").value("TECHNOLOGY"));
    }

    @Test
    void filter_byIndustryAndLevel_returnsIntersection() throws Exception {
        save("Tech Beginner", "https://example.com/tech-beginner");
        resourceRepository.save(Resource.builder()
            .title("Finance Beginner")
            .url("https://example.com/finance-beginner")
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.BEGINNER)
            .industry(IndustryEnum.FINANCE)
            .category(cat)
            .build());
        resourceRepository.save(Resource.builder()
            .title("Tech Advanced")
            .url("https://example.com/tech-advanced")
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.ADVANCED)
            .industry(IndustryEnum.TECHNOLOGY)
            .category(cat)
            .build());

        mockMvc.perform(get("/api/resources/filter?industry=TECHNOLOGY&level=BEGINNER"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].title").value("Tech Beginner"));
    }

    @Test
    void filter_noParams_returnsAll() throws Exception {
        save("First", "https://example.com/first");
        save("Second", "https://example.com/second");

        mockMvc.perform(get("/api/resources/filter"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(2));
    }

    // ── Categories ────────────────────────────────────────────────────────────

    @Test
    void listCategories_returns200WithCategories() throws Exception {
        mockMvc.perform(get("/api/resources/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].name").value("Technology"));
    }

    // ── Create resource ───────────────────────────────────────────────────────

    @Test
    void createResource_valid_returns201WithTitle() throws Exception {
        String json = validJson("New Resource", "https://example.com/new");

        mockMvc.perform(post("/api/resources")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("New Resource"))
            .andExpect(jsonPath("$.id").exists());

        verify(resourceEventProducer).publishResourceCreated(any());
    }

    @Test
    void createResource_missingTitle_returns400() throws Exception {
        String json = objectMapper.writeValueAsString(ResourceRequest.builder()
            .url("https://example.com/notitle")
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.BEGINNER)
            .industry(IndustryEnum.TECHNOLOGY)
            .build());

        mockMvc.perform(post("/api/resources")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createResource_invalidUrl_returns400() throws Exception {
        String json = objectMapper.writeValueAsString(ResourceRequest.builder()
            .title("Valid Title")
            .url("not-a-url")
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.BEGINNER)
            .industry(IndustryEnum.TECHNOLOGY)
            .build());

        mockMvc.perform(post("/api/resources")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createResource_titleTooLong_returns400() throws Exception {
        String json = objectMapper.writeValueAsString(ResourceRequest.builder()
            .title("A".repeat(256))
            .url("https://example.com/toolong")
            .type(ResourceTypeEnum.ARTICLE)
            .level(ResourceLevelEnum.BEGINNER)
            .industry(IndustryEnum.TECHNOLOGY)
            .build());

        mockMvc.perform(post("/api/resources")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createResource_duplicateUrl_returns400() throws Exception {
        save("Existing", "https://example.com/duplicate");

        mockMvc.perform(post("/api/resources")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(validJson("New Same URL", "https://example.com/duplicate")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    void createResource_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/resources")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validJson("Unauthorized", "https://example.com/unauth")))
            .andExpect(status().isUnauthorized());
    }

    // ── Update resource ───────────────────────────────────────────────────────

    @Test
    void updateResource_valid_returns200WithUpdatedTitle() throws Exception {
        Resource r = save("Old Title", "https://example.com/update");
        String json = validJson("New Title", "https://example.com/update");

        mockMvc.perform(put("/api/resources/{id}", r.getId())
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("New Title"));

        verify(resourceEventProducer).publishResourceUpdated(any());
    }

    @Test
    void updateResource_notFound_returns404() throws Exception {
        mockMvc.perform(put("/api/resources/{id}", UUID.randomUUID())
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(validJson("Title", "https://example.com/ghost")))
            .andExpect(status().isNotFound());
    }

    // ── Delete resource (soft delete) ─────────────────────────────────────────

    @Test
    void deleteResource_returns204_andGetReturns404() throws Exception {
        Resource r = save("To Delete", "https://example.com/delete");
        resourceRepository.flush();

        mockMvc.perform(delete("/api/resources/{id}", r.getId()).with(jwt()))
            .andExpect(status().isNoContent());

        // Flush the soft-delete and evict L1 cache so the next GET hits the DB filter.
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/resources/{id}", r.getId()))
            .andExpect(status().isNotFound());

        verify(resourceEventProducer).publishResourceDeleted(any());
    }

    @Test
    void deleteResource_softDelete_excludedFromStats() throws Exception {
        Resource r = save("Temporary", "https://example.com/temp");
        resourceRepository.flush();

        mockMvc.perform(get("/api/resources/stats"))
            .andExpect(jsonPath("$.totalCount").value(1));

        mockMvc.perform(delete("/api/resources/{id}", r.getId()).with(jwt()))
            .andExpect(status().isNoContent());

        resourceRepository.flush();

        mockMvc.perform(get("/api/resources/stats"))
            .andExpect(jsonPath("$.totalCount").value(0));
    }

    @Test
    void deleteResource_softDelete_urlCanBeReused() throws Exception {
        Resource r = save("To Delete", "https://example.com/reuse");
        resourceRepository.flush();

        mockMvc.perform(delete("/api/resources/{id}", r.getId()).with(jwt()))
            .andExpect(status().isNoContent());

        resourceRepository.flush();

        // existsByUrl() respects @SQLRestriction so returns false after soft delete
        mockMvc.perform(post("/api/resources")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(validJson("Reused URL Resource", "https://example.com/reuse")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Reused URL Resource"));
    }

    @Test
    void deleteResource_notFound_returns404() throws Exception {
        mockMvc.perform(delete("/api/resources/{id}", UUID.randomUUID()).with(jwt()))
            .andExpect(status().isNotFound());
    }

    // ── Bookmarks ─────────────────────────────────────────────────────────────

    @Test
    void addBookmark_returns201_andListBookmarks_returnsEntry() throws Exception {
        Resource r = save("Bookmarkable", "https://example.com/bk");
        String userId = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/resources/bookmarks/{id}", r.getId())
                .with(jwt().jwt(j -> j.subject(userId))))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/resources/bookmarks")
                .with(jwt().jwt(j -> j.subject(userId))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void addBookmark_duplicate_returns409() throws Exception {
        Resource r = save("Bookmarkable", "https://example.com/bkdup");
        String userId = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/resources/bookmarks/{id}", r.getId())
                .with(jwt().jwt(j -> j.subject(userId))))
            .andExpect(status().isCreated());

        bookmarkRepository.flush();

        mockMvc.perform(post("/api/resources/bookmarks/{id}", r.getId())
                .with(jwt().jwt(j -> j.subject(userId))))
            .andExpect(status().isConflict());
    }

    @Test
    void removeBookmark_returns204() throws Exception {
        Resource r = save("To Unbookmark", "https://example.com/bkrm");
        String userId = UUID.randomUUID().toString();

        String addResponse = mockMvc.perform(post("/api/resources/bookmarks/{id}", r.getId())
                .with(jwt().jwt(j -> j.subject(userId))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        bookmarkRepository.flush();

        String bookmarkId = objectMapper.readTree(addResponse).get("id").asText();

        mockMvc.perform(delete("/api/resources/bookmarks/{id}", bookmarkId)
                .with(jwt().jwt(j -> j.subject(userId))))
            .andExpect(status().isNoContent());
    }

    @Test
    void removeBookmark_wrongUser_returns400() throws Exception {
        Resource r = save("Protected Bookmark", "https://example.com/bkwrong");
        String ownerUserId = UUID.randomUUID().toString();

        String addResponse = mockMvc.perform(post("/api/resources/bookmarks/{id}", r.getId())
                .with(jwt().jwt(j -> j.subject(ownerUserId))))
            .andReturn().getResponse().getContentAsString();

        bookmarkRepository.flush();

        String bookmarkId = objectMapper.readTree(addResponse).get("id").asText();

        mockMvc.perform(delete("/api/resources/bookmarks/{id}", bookmarkId)
                .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString()))))
            .andExpect(status().isBadRequest());
    }

    // ── Kafka events ──────────────────────────────────────────────────────────

    @Test
    void createAndDelete_publishBothKafkaEvents() throws Exception {
        mockMvc.perform(post("/api/resources")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(validJson("Event Resource", "https://example.com/events")))
            .andExpect(status().isCreated());

        verify(resourceEventProducer, times(1)).publishResourceCreated(any());

        Resource created = resourceRepository.findAll().get(0);
        resourceRepository.flush();

        mockMvc.perform(delete("/api/resources/{id}", created.getId()).with(jwt()))
            .andExpect(status().isNoContent());

        verify(resourceEventProducer, times(1)).publishResourceDeleted(any());
    }

    // ── Input validation guards ───────────────────────────────────────────────

    @Test
    void getById_invalidUuid_returns400() throws Exception {
        mockMvc.perform(get("/api/resources/not-a-uuid").with(jwt()))
            .andExpect(status().isBadRequest());
    }

    // ── Override RedisCacheConfig so @Cacheable never hits a real Redis ───────

    @TestConfiguration
    static class NoCacheConfig {
        @Bean
        @Primary
        CacheManager noOpCacheManager() {
            return new NoOpCacheManager();
        }
    }
}
