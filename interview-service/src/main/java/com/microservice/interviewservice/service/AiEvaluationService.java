package com.microservice.interviewservice.service;

import com.microservice.interviewservice.dto.ai.AiEvaluationResult;
import com.microservice.interviewservice.model.Question;

/**
 * Scores a candidate's answer to an interview question.
 *
 * The default implementation sends the question + transcription to Claude
 * and parses a structured score + feedback. Falls back gracefully on failure.
 */
public interface AiEvaluationService {

    /**
     * @param question      the question that was asked
     * @param transcription the candidate's spoken/written answer
     * @return a scored result with a 0–1 score and coaching feedback
     */
    AiEvaluationResult evaluate(Question question, String transcription);
}