package com.microservice.resourceservice.messaging.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceEvent {

    private UUID eventId;
    private UUID resourceId;
    private String eventType;
    private LocalDateTime timestamp;
    private String resourceTitle;
}
