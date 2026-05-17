package com.microservice.trainingservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingPreferencesRequest {

    private String goal;
    private String targetRole;
    private String seniority;

    @Min(0)
    @Max(600)
    private Integer minutesPerDay;
}
