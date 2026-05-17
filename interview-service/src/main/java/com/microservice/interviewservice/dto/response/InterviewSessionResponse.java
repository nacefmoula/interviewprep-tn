package com.microservice.interviewservice.dto.response;

import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.InterviewLanguage;
import com.microservice.interviewservice.ennum.InterviewTypeEnum;
import com.microservice.interviewservice.ennum.SessionStatusEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSessionResponse {

    private Long              id;
    private String            userId;
    private InterviewTypeEnum type;
    private IndustryEnum      industry;
    private CareerLevelEnum   targetLevel;
    private SessionStatusEnum status;
    private InterviewLanguage language;
    private Integer           durationMinutes;
    private Integer           difficultyLevel;
    private Boolean           isRecorded;
    private Boolean           consentGiven;
    private String            recordingUrl;
    private LocalDateTime     startedAt;
    private LocalDateTime     endedAt;
    private LocalDateTime     createdAt;
    private Long              remainingTimeMinutes;
}