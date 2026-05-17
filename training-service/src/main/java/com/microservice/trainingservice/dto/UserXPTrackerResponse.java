package com.microservice.trainingservice.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserXPTrackerResponse {
    private Long id;
    private String userId;
    private Integer totalXp;
    private Integer currentLevel;
    private Integer xpToNextLevel;
    private Integer currentStreak;
    private Integer longestStreak;
    private LocalDate lastActivityDate;
}
