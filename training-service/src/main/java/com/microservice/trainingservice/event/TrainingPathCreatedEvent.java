package com.microservice.trainingservice.event;

import com.microservice.trainingservice.model.PathStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingPathCreatedEvent {
    private Long pathId;
    private String userId;
    private PathStatus status;
    private LocalDateTime createdAt;
}
