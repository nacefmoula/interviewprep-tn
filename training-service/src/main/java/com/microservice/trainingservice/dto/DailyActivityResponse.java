package com.microservice.trainingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyActivityResponse {
    private Long id;
    private String userId;
    private LocalDate activityDate;
    private Integer xpEarned;
    private Boolean sessionCompleted;
    private Integer goalsCompleted;
    private Integer behavioralCount;
    private Integer libraryCount;
    private Integer quizCount;
    private LocalDateTime createdAt;
}
