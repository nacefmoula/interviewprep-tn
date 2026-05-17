package com.microservice.trainingservice.event;

import com.microservice.trainingservice.model.ModuleStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingPathUpdatedEvent {
    private Long pathId;
    private String userId;
    private Long moduleId;
    private ModuleStatus moduleStatus;
    private Integer moduleProgress;
    private Integer totalXp;
    private LocalDateTime updatedAt;
}
