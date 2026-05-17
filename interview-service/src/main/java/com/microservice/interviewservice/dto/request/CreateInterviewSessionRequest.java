package com.microservice.interviewservice.dto.request;

import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.InterviewLanguage;
import com.microservice.interviewservice.ennum.InterviewTypeEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateInterviewSessionRequest {

    @NotNull(message = "Interview type is required.")
    private InterviewTypeEnum type;

    @NotNull(message = "Industry is required.")
    private IndustryEnum industry;

    @NotNull(message = "Target career level is required.")
    private CareerLevelEnum targetLevel;

    @NotNull(message = "Duration in minutes is required.")
    @Positive(message = "Duration must be greater than 0.")
    private Integer durationMinutes;

    @NotNull(message = "Difficulty level is required.")
    @Min(value = 1, message = "Difficulty level must be at least 1.")
    @Max(value = 10, message = "Difficulty level cannot exceed 10.")
    private Integer difficultyLevel;

    @NotNull(message = "isRecorded flag is required.")
    private Boolean isRecorded;

    @NotNull(message = "consentGiven flag is required.")
    private Boolean consentGiven;

    /**
     * Interview language. Optional — defaults to EN in the mapper if null.
     * Controls which Vosk acoustic model is used for speech-to-text on this session.
     */
    private InterviewLanguage language;
}