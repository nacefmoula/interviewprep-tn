package com.microservice.interviewservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitResponseRequest {

    @NotNull(message = "questionId is required")
    private Long questionId;

    private String transcription;
    private String audioFileUrl;
    private String videoFileUrl;
    private Integer durationSeconds;
    private Integer wordCount;
    // overallScore is NOT here — computed server-side
}