package com.microservice.userservice.messaging.consumer;

import com.microservice.userservice.messaging.event.UserEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class UserEventConsumer {

    @KafkaListener(
        topics = {
            "user.created",
            "user.updated",
            "user.deleted",
            "user.role-changed",
            "user.verified",
            "user.suspended"
        },
        groupId = "user-service-group"
    )
    public void consume(
            @Payload UserEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        log.info("Received event: type={} userId={} topic={} partition={} offset={}",
            event.getEventType(),
            event.getUserId(),
            topic,
            partition,
            offset);

        switch (event.getEventType()) {
            case USER_CREATED ->
                log.info("New user registered: {} {} ({})",
                    event.getFirstName(), event.getLastName(), event.getEmail());

            case USER_UPDATED ->
                log.info("User updated: {} ({})",
                    event.getUserId(), event.getEmail());

            case USER_DELETED ->
                log.info("User deleted: {} ({})",
                    event.getUserId(), event.getEmail());

            case USER_ROLE_CHANGED ->
                log.info("User role changed: {} -> new role: {}",
                    event.getUserId(), event.getRole());

            case USER_VERIFIED ->
                log.info("User verified: {} ({})",
                    event.getUserId(), event.getEmail());

            case USER_SUSPENDED ->
                log.info("User suspended: {} ({})",
                    event.getUserId(), event.getEmail());

            default ->
                log.warn("Unknown event type: {}", event.getEventType());
        }
    }

    @KafkaListener(
        topics = "user.events.DLQ",
        groupId = "user-service-dlq-group"
    )
    public void consumeDLQ(
            @Payload String message,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        log.error("DLQ message received on topic {}: {}", topic, message);
    }
}
