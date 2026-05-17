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
public class DailyActivityUpsertRequest {

    @NotBlank
    private String userId;

    @NotNull
    private LocalDate activityDate;

    @NotNull
    @Min(0)
    private Integer xpEarned;

    @NotNull
    private Boolean sessionCompleted;

    @NotNull
    @Min(0)
    private Integer goalsCompleted;

    @NotNull
    @Min(0)
    private Integer behavioralCount;

    @NotNull
    @Min(0)
    private Integer libraryCount;

    @NotNull
    @Min(0)
    private Integer quizCount;
}
