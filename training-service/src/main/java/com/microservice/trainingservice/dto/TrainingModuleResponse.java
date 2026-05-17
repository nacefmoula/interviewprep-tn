package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.ModuleStatus;
import com.microservice.trainingservice.model.TrainingCategory;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingModuleResponse {
    private Long id;
    private Long pathId;
    private TrainingCategory category;
    private String title;
    private Integer lessons;
    private Integer completedLessons;
    private Integer progress;
    private Integer xpReward;
    private ModuleStatus status;
    private LocalDateTime unlockedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TrainingModuleLessonResponse> moduleLessons;
}
