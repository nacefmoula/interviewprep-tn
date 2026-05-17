package com.microservice.trainingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingPreferencesResponse {

    private String userId;
    private String goal;
    private String targetRole;
    private String seniority;
    private Integer minutesPerDay;
    private LocalDateTime updatedAt;
}
