package com.microservice.resourceservice.service;

import com.microservice.resourceservice.config.AiGenerationProperties;
import com.microservice.resourceservice.dto.AiGenerateResourcesRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiResourceGenerationScheduler {

    private final AiGenerationProperties props;
    private final AiResourceGenerationService generationService;

    @Scheduled(cron = "${ai.generation.cron:0 0 3 * * *}")
    public void scheduledGeneration() {
        if (!props.isScheduleEnabled()) {
            return;
        }

        int batchSize = Math.max(1, props.getBatchSize());
        try {
            generationService.generateAndInsert(AiGenerateResourcesRequest.builder().count(batchSize).build());
        } catch (Exception e) {
            log.warn("Scheduled AI resource generation failed: {}", e.getMessage());
        }
    }
}

