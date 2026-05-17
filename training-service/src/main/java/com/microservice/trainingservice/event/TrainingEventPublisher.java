package com.microservice.trainingservice.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.trainingservice.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TrainingEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void publishTrainingPathCreated(TrainingPathCreatedEvent event) {
        publish("training.path.created", event.getUserId(), event);
    }

    public void publishTrainingPathUpdated(TrainingPathUpdatedEvent event) {
        publish("training.path.updated", event.getUserId(), event);
    }

    public void publishUserBadgeEarned(UserBadgeEarnedEvent event) {
        publish("user.badge.earned", event.getUserId(), event);
    }

    private void publish(String topic, String key, Object payload) {
        try {
            kafkaTemplate.send(topic, key, objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to serialize event payload for topic " + topic);
        }
    }
}
