package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.ModuleStatus;
import com.microservice.trainingservice.model.TrainingCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingModuleUpsertRequest {

    @NotNull
    private Long pathId;

    @NotNull
    private TrainingCategory category;

    @NotBlank
    @Size(max = 500)
    private String title;

    private String description;

    @NotNull
    @Min(1)
    private Integer lessons;

    @NotNull
    @Min(0)
    private Integer completedLessons;

    @Min(0)
    @Max(100)
    private Integer progress;

    @NotNull
    @Min(0)
    private Integer xpReward;

    @NotNull
    private ModuleStatus status;

    private LocalDateTime unlockedAt;
}
