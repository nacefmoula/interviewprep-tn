package com.microservice.trainingservice.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDailyActivityRequest {
    private String userId;
    private LocalDate activityDate;
    private Integer xpEarned;
    private Boolean sessionCompleted;
    private Integer goalsCompleted;
    private Integer behavioralCount;
    private Integer libraryCount;
    private Integer quizCount;
}
