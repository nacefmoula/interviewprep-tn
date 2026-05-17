package com.microservice.resourceservice;

import com.microservice.resourceservice.messaging.producer.ResourceEventProducer;
import com.microservice.resourceservice.security.ResourceAccessControlService;
import com.microservice.resourceservice.service.AiClassifyService;
import com.microservice.resourceservice.service.AiQualityScoreService;
import com.microservice.resourceservice.service.AiRelatedResourcesService;
import com.microservice.resourceservice.service.AiResourceGenerationService;
import com.microservice.resourceservice.service.AiResourceSummaryService;
import com.microservice.resourceservice.service.AiTranslationService;
import com.microservice.resourceservice.service.ObjectStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
class ResourceServiceApplicationTests extends AbstractPostgresIntegrationTest {

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

    @Test
    void contextLoads() {
    }
}
