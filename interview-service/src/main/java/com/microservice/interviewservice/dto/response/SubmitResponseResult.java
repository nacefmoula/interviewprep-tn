package com.microservice.interviewservice.dto.response;

import com.microservice.interviewservice.model.Question;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SubmitResponseResult {

    private Long responseId;
    private Long sessionId;
    private Long questionId;
    private Double overallScore;

    // null = no more questions, session should be completed
    private Question nextQuestion;
}