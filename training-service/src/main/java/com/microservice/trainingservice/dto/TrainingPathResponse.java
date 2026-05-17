package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.PathStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingPathResponse {
    private Long id;
    private String userId;
    private PathStatus status;
    private Integer xpThreshold;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TrainingModuleResponse> modules;
}
