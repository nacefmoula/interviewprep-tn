package com.microservice.interviewservice.dto.request;

import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.InterviewTypeEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateInterviewSessionRequest {

    private InterviewTypeEnum type;
    private IndustryEnum      industry;
    private CareerLevelEnum   targetLevel;

    @Positive(message = "Duration must be greater than 0.")
    private Integer durationMinutes;

    @Min(value = 1, message = "Difficulty level must be at least 1.")
    @Max(value = 10, message = "Difficulty level cannot exceed 10.")
    private Integer difficultyLevel;

    private Boolean isRecorded;
    private Boolean consentGiven;
}