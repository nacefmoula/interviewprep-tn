package com.microservice.trainingservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewSessionCompletedEvent {
    private Long sessionId;
    private String userId;
    private String sessionType;
    private Double globalScore;
    private String preparationLevel;
    private Integer totalSessionsCompleted;
    private String generatedAt;
}
