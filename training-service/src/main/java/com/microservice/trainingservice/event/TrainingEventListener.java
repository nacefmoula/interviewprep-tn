package com.microservice.trainingservice.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.trainingservice.exception.BusinessException;
import com.microservice.trainingservice.service.TrainingGamificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrainingEventListener {

    private final ObjectMapper objectMapper;
    private final TrainingGamificationService trainingGamificationService;

    @KafkaListener(topics = "interview.session.completed", groupId = "training-service")
    public void onInterviewSessionCompleted(String payload) {
        try {
            InterviewSessionCompletedEvent event = objectMapper.readValue(payload, InterviewSessionCompletedEvent.class);
            trainingGamificationService.processInterviewCompleted(event);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse interview.session.completed payload: {}", payload, e);
            throw new BusinessException("Invalid interview.session.completed payload");
        }
    }
}
