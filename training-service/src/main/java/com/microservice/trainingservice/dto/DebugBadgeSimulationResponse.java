package com.microservice.trainingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DebugBadgeSimulationResponse {
    private String userId;
    private Long pathId;
    private Integer completedModules;
    private Integer totalXp;
    private Integer currentStreak;
    private Integer totalBadgesAwarded;
    private List<String> newlyAwardedBadges;
    private List<String> allAwardedBadges;
}
