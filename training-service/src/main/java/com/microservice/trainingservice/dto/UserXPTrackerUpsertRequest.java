package com.microservice.trainingservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserXPTrackerUpsertRequest {

    @NotBlank
    private String userId;

    @NotNull
    @Min(0)
    private Integer totalXp;

    @NotNull
    @Min(1)
    private Integer currentLevel;

    @NotNull
    @Min(0)
    private Integer xpToNextLevel;

    @NotNull
    @Min(0)
    private Integer currentStreak;

    @NotNull
    @Min(0)
    private Integer longestStreak;

    private LocalDate lastActivityDate;
}
