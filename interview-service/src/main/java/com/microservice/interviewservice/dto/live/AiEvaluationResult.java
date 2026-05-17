package com.microservice.interviewservice.dto.live;

/**
 * The structured result returned by AiEvaluationService after scoring
 * a candidate's answer.
 *
 * @param overallScore  0.0 – 1.0
 * @param feedback      2-4 sentence coaching note shown to the candidate
 */
public record AiEvaluationResult(
        double overallScore,
        String feedback
) {
    /** Safe fallback used when the AI call fails. */
    public static AiEvaluationResult fallback() {
        return new AiEvaluationResult(0.3, "Unable to evaluate at this time. Keep practicing!");
    }
}