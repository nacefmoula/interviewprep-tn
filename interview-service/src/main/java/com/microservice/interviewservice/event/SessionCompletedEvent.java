package com.microservice.interviewservice.event;

import com.microservice.interviewservice.ennum.InterviewTypeEnum;
import com.microservice.interviewservice.ennum.PreparationLevelEnum;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionCompletedEvent {

    private Long              sessionId;
    private String            userId;
    private InterviewTypeEnum sessionType;
    private Double            globalScore;
    private PreparationLevelEnum preparationLevel;
    private Integer           totalSessionsCompleted;
    private String            generatedAt;
}