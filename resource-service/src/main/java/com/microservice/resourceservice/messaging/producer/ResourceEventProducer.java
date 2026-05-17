package com.microservice.resourceservice.messaging.producer;

import com.microservice.resourceservice.messaging.event.ResourceEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceEventProducer {

    private final KafkaTemplate<Object, Object> kafkaTemplate;

    public void publishResourceCreated(ResourceEvent event) {
        sendEvent("resource.created", event);
    }

    public void publishResourceUpdated(ResourceEvent event) {
        sendEvent("resource.updated", event);
    }

    public void publishResourceDeleted(ResourceEvent event) {
        sendEvent("resource.deleted", event);
    }

    private void sendEvent(String topic, ResourceEvent event) {
        try {
            kafkaTemplate.send(topic, event.getResourceId().toString(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish {} event for resourceId={}: {}",
                            topic, event.getResourceId(), ex.getMessage());
                    } else {
                        log.debug("Published {} event for resourceId={}", topic, event.getResourceId());
                    }
                });
        } catch (Exception ex) {
            // Never let a Kafka failure break the API response.
            log.error("Kafka send() threw synchronously for topic={} resourceId={}: {}",
                topic, event.getResourceId(), ex.getMessage());
        }
    }
}
