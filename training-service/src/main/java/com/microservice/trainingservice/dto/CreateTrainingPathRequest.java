package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.PathStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTrainingPathRequest {
    private String userId;
    private PathStatus status;
    private Integer xpThreshold;
}
