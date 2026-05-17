package com.microservice.interviewservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.client.GroqClient;
import com.microservice.interviewservice.dto.ai.AiEvaluationResult;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.service.AiEvaluationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.microservice.interviewservice.exception.BusinessException;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiEvaluationServiceImpl implements AiEvaluationService {

    private final GroqClient anthropicClient;
    private final ObjectMapper    objectMapper;

    @Override
    public AiEvaluationResult evaluate(Question question, String transcription) {
        if (transcription == null || transcription.isBlank()) {
            return new AiEvaluationResult(0.1, "No answer was provided.");
        }
        try {
            log.info("Calling Claude to evaluate answer [questionId={}]", question.getId());
            String rawText = anthropicClient.ask(buildPrompt(question, transcription));
            String json    = GroqClient.stripJsonFences(rawText);
            AiEvaluationResult result = parse(json);
            log.info("AI evaluation complete [questionId={}, score={}]", question.getId(), result.overallScore());
            return result;
        } catch (Exception ex) {
            log.error("AI evaluation FAILED — using fallback. Check ANTHROPIC_API_KEY. [questionId={}, reason={}]",
                      question.getId(), ex.getMessage());
            return AiEvaluationResult.fallback();
        }
    }

    private String buildPrompt(Question question, String transcription) {
        String expectedMethod = question.getExpectedMethod() != null
                ? question.getExpectedMethod()
                : "Structure the answer clearly with a specific example and a measurable result.";
        return String.format("""
                You are an expert interview evaluator. Score this candidate response.

                Question: "%s"
                Strong answer looks like: "%s"
                Candidate's answer: "%s"

                Evaluate: Relevance, Structure, Depth, Specificity, Professionalism.

                Respond ONLY with valid JSON:
                {
                  "overallScore": <number 0.0 to 1.0>,
                  "feedback": "<2-4 sentences: what was good, main thing to improve>"
                }
                """, question.getText(), expectedMethod, truncate(transcription, 2000));
    }

    @SuppressWarnings("unchecked")
    private AiEvaluationResult parse(String json) throws Exception {
        Map<String, Object> parsed = objectMapper.readValue(json, Map.class);
        Object scoreObj = parsed.get("overallScore");
        double score = switch (scoreObj) {
            case Double  d -> d;
            case Integer i -> i.doubleValue();
            case String  s -> Double.parseDouble(s);
            case null, default -> throw new IllegalStateException("Missing overallScore: " + scoreObj);
        };
        score = Math.min(1.0, Math.max(0.0, score));
        String feedback = (String) parsed.getOrDefault("feedback", "No feedback provided.");
        return new AiEvaluationResult(score, feedback);
    }

    private String truncate(String text, int max) {
        return text.length() > max ? text.substring(0, max) + "…" : text;
    }
}
