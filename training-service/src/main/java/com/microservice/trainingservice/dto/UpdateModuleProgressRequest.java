package com.microservice.trainingservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateModuleProgressRequest {
    private Integer completedLessons;
    private Integer progress;
}
