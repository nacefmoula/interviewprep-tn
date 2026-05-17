package com.microservice.trainingservice;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.trainingservice.dto.TrainingPreferencesRequest;
import com.microservice.trainingservice.model.TrainingUserSignal;
import com.microservice.trainingservice.model.TrainingCategory;
import com.microservice.trainingservice.model.ModuleStatus;
import com.microservice.trainingservice.repository.TrainingUserSignalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.ConfluentKafkaContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.Map;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Testcontainers
class TrainingPersonalizationIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine");

    // Not @ServiceConnection: training has a hand-rolled KafkaProducerConfig /
    // KafkaConsumerConfig that read @Value("${spring.kafka.bootstrap-servers}"),
    // which ServiceConnection does not populate — so wire the property directly.
    @Container
    static final ConfluentKafkaContainer KAFKA =
        new ConfluentKafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }

    MockMvc mockMvc;

    @Autowired
    WebApplicationContext context;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    TrainingUserSignalRepository trainingUserSignalRepository;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
            .apply(springSecurity())
            .build();
    }

    @Test
    void preferences_roundTrip_putThenGet() throws Exception {
        String userId = "user-1";

        TrainingPreferencesRequest request = TrainingPreferencesRequest.builder()
            .goal("TECHNICAL")
            .targetRole("Backend")
            .seniority("JUNIOR")
            .minutesPerDay(30)
            .build();

        mockMvc.perform(
                put("/api/v1/training/preferences/me")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
            )
            .andExpect(status().isOk());

        String body = mockMvc.perform(
                get("/api/v1/training/preferences/me")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> response = objectMapper.readValue(body, Map.class);
        assertThat(response.get("userId")).isEqualTo(userId);
        assertThat(response.get("goal")).isEqualTo("TECHNICAL");
        assertThat(response.get("targetRole")).isEqualTo("Backend");
        assertThat(response.get("seniority")).isEqualTo("JUNIOR");
        assertThat(((Number) response.get("minutesPerDay")).intValue()).isEqualTo(30);
    }

    @Test
    void generatePath_usesStoredSignalsAndPreferencesToPickUnlockedCategory() throws Exception {
        String userId = "user-2";

        // Save a signal snapshot (as if Kafka consumed an interview completion event)
        trainingUserSignalRepository.save(TrainingUserSignal.builder()
            .userId(userId)
            .lastSessionId(123L)
            .sessionType("MOCK")
            .globalScore(65.0)
            .preparationLevel("INTERMEDIATE")
            .totalSessionsCompleted(20)
            .eventGeneratedAt("2026-01-01T00:00:00Z")
            .build());

        // Set a TECHNICAL goal to bias ordering toward industry-specific/content-prep
        TrainingPreferencesRequest request = TrainingPreferencesRequest.builder()
            .goal("TECHNICAL")
            .minutesPerDay(45)
            .build();

        mockMvc.perform(
                put("/api/v1/training/preferences/me")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
            )
            .andExpect(status().isOk());

        String body = mockMvc.perform(
                post("/api/v1/training/paths/generate")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
                    .contentType(MediaType.APPLICATION_JSON)
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> response = objectMapper.readValue(body, Map.class);

        assertThat(response.get("userId")).isEqualTo(userId);

        @SuppressWarnings("unchecked")
        var modules = (java.util.List<Map<String, Object>>) response.get("modules");
        assertThat(modules).hasSize(TrainingCategory.values().length);

        Map<String, Object> unlocked = modules.stream()
            .filter(m -> ModuleStatus.IN_PROGRESS.name().equals(m.get("status")))
            .findFirst()
            .orElseThrow();

        assertThat(unlocked.get("category")).isEqualTo(TrainingCategory.INDUSTRY_SPECIFIC.name());
    }

    @Test
    void createNewPath_archivesOld_andHistoryContainsBoth() throws Exception {
        String userId = "user-3";

        String firstBody = mockMvc.perform(
                post("/api/v1/training/paths/generate")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
                    .contentType(MediaType.APPLICATION_JSON)
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> first = objectMapper.readValue(firstBody, Map.class);
        long firstId = ((Number) first.get("id")).longValue();

        String secondBody = mockMvc.perform(
                post("/api/v1/training/paths/new")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
                    .contentType(MediaType.APPLICATION_JSON)
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> second = objectMapper.readValue(secondBody, Map.class);
        long secondId = ((Number) second.get("id")).longValue();
        assertThat(secondId).isNotEqualTo(firstId);

        String historyBody = mockMvc.perform(
                get("/api/v1/training/paths/me/history")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        List<Map<String, Object>> history = objectMapper.readValue(historyBody, new TypeReference<>() {});
        assertThat(history).hasSize(2);

        Map<String, Object> latest = history.getFirst();
        assertThat(((Number) latest.get("id")).longValue()).isEqualTo(secondId);

        Map<String, Object> archived = history.stream()
            .filter(p -> ((Number) p.get("id")).longValue() == firstId)
            .findFirst()
            .orElseThrow();
        assertThat(archived.get("status")).isEqualTo("ARCHIVED");
    }

    @Test
    void completingAModule_unlocksNextModule() throws Exception {
        String userId = "user-4";

        String body = mockMvc.perform(
                post("/api/v1/training/paths/generate")
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
                    .contentType(MediaType.APPLICATION_JSON)
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> path = objectMapper.readValue(body, Map.class);
        long pathId = ((Number) path.get("id")).longValue();
        @SuppressWarnings("unchecked")
        var modules = (java.util.List<Map<String, Object>>) path.get("modules");

        Map<String, Object> inProgress = modules.stream()
            .filter(m -> ModuleStatus.IN_PROGRESS.name().equals(m.get("status")))
            .findFirst()
            .orElseThrow();
        long moduleId = ((Number) inProgress.get("id")).longValue();
        int lessons = ((Number) inProgress.get("lessons")).intValue();

        mockMvc.perform(
                put("/api/v1/training/paths/{pathId}/modules/{moduleId}?userId={userId}", pathId, moduleId, userId)
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "completedLessons", lessons,
                        "progress", 100
                    )))
            )
            .andExpect(status().isOk());

        String reloadedBody = mockMvc.perform(
                get("/api/v1/training/paths/user/{userId}", userId)
                    .with(jwt().jwt(jwt -> jwt.subject(userId)))
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> reloaded = objectMapper.readValue(reloadedBody, Map.class);
        @SuppressWarnings("unchecked")
        var reloadedModules = (java.util.List<Map<String, Object>>) reloaded.get("modules");

        boolean hasInProgress = reloadedModules.stream()
            .anyMatch(m -> ModuleStatus.IN_PROGRESS.name().equals(m.get("status")));
        assertThat(hasInProgress).isTrue();
    }
}
