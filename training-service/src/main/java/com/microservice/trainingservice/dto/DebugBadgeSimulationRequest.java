package com.microservice.trainingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DebugBadgeSimulationRequest {
    private String userId;
    private Integer targetSessionsCompleted;
    private Double targetGlobalScore;
    private String targetPreparationLevel;
    private Integer targetStreakDays;
    private Integer targetXp;
}
