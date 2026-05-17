package com.microservice.userservice.messaging.producer;

import com.microservice.userservice.messaging.event.EventType;
import com.microservice.userservice.messaging.event.UserEvent;
import com.microservice.userservice.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventProducer {

    private static final String TOPIC_CREATED      = "user.created";
    private static final String TOPIC_UPDATED      = "user.updated";
    private static final String TOPIC_DELETED      = "user.deleted";
    private static final String TOPIC_ROLE_CHANGED = "user.role-changed";
    private static final String TOPIC_VERIFIED     = "user.verified";
    private static final String TOPIC_SUSPENDED    = "user.suspended";

    private final KafkaTemplate<String, UserEvent> kafkaTemplate;

    public void publishUserCreated(User user) {
        publish(TOPIC_CREATED, EventType.USER_CREATED, user);
    }

    public void publishUserUpdated(User user) {
        publish(TOPIC_UPDATED, EventType.USER_UPDATED, user);
    }

    public void publishUserDeleted(User user) {
        publish(TOPIC_DELETED, EventType.USER_DELETED, user);
    }

    public void publishUserRoleChanged(User user) {
        publish(TOPIC_ROLE_CHANGED, EventType.USER_ROLE_CHANGED, user);
    }

    public void publishUserVerified(User user) {
        publish(TOPIC_VERIFIED, EventType.USER_VERIFIED, user);
    }

    public void publishUserSuspended(User user) {
        publish(TOPIC_SUSPENDED, EventType.USER_SUSPENDED, user);
    }

    private void publish(String topic, EventType eventType, User user) {
        UserEvent event = UserEvent.from(eventType, user);
        String key = user.getId().toString();

        try {
            CompletableFuture<SendResult<String, UserEvent>> future =
                kafkaTemplate.send(topic, key, event);

            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish {} event for user {}: {}",
                        eventType, user.getId(), ex.getMessage());
                } else {
                    log.info("Published {} event for user {} to topic {} partition {} offset {}",
                        eventType,
                        user.getId(),
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
        } catch (KafkaException exception) {
            // Never fail the user request because event publication is unavailable.
            log.error("Kafka send skipped for {} user {} on topic {}: {}",
                eventType, user.getId(), topic, exception.getMessage());
        } catch (Exception exception) {
            // Publishing should not break the user-service API (especially in local/dev Docker stacks).
            log.error("Failed to publish {} event for user {} (send threw): {}",
                eventType, user.getId(), exception.getMessage());
        }
    }
}
