package com.microservice.interviewservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.client.GroqClient;
import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.InterviewTypeEnum;
import com.microservice.interviewservice.exception.BusinessException;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.service.AiQuestionService;
import com.microservice.interviewservice.service.QuestionPersistenceService;
import com.microservice.interviewservice.service.QuestionSelectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiQuestionServiceImpl implements AiQuestionService {

    private static final int MAX_ATTEMPTS = 3;

    private final GroqClient groqClient;
    private final QuestionPersistenceService questionPersistenceService;
    private final ObjectMapper objectMapper;

    @Override
    public Question generateQuestion(InterviewSession session, List<Long> alreadyAskedIds) {
        return generateQuestion(session, alreadyAskedIds, null);
    }

    @Override
    public Question generateQuestion(InterviewSession session,
                                     List<Long> alreadyAskedIds,
                                     String candidateContext) {
        InterviewTypeEnum type = session.getType();
        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                log.info("Groq question generation [sessionId={}, type={}, attempt={}/{}]",
                        session.getId(), type, attempt, MAX_ATTEMPTS);

                String prompt = buildPrompt(
                        session,
                        alreadyAskedIds == null ? 0 : alreadyAskedIds.size(),
                        candidateContext,
                        attempt,
                        lastException == null ? null : lastException.getMessage()
                );

                String rawText = groqClient.ask(prompt);
                log.info("Raw Groq response [sessionId={}, attempt={}, preview={}]",
                        session.getId(),
                        attempt,
                        rawText == null ? "null" : rawText.substring(0, Math.min(300, rawText.length())));

                Map<String, String> parsed = parseModelOutput(rawText, type);
                validateStructure(parsed);
                validateTypeField(parsed, type);

                Question question = buildQuestion(session, parsed);
                Question saved = questionPersistenceService.saveGeneratedQuestion(question);

                log.info("Question saved [sessionId={}, questionId={}, attempt={}]",
                        session.getId(), saved.getId(), attempt);
                return saved;

            } catch (Exception ex) {
                lastException = ex;
                log.error("Attempt {}/{} failed [sessionId={}, type={}]. cause={} message={}",
                        attempt,
                        MAX_ATTEMPTS,
                        session.getId(),
                        session.getType(),
                        ex.getClass().getName(),
                        ex.getMessage(),
                        ex);
            }
        }

        throw new BusinessException(
                "Unable to generate next question after " + MAX_ATTEMPTS + " attempts. Last error: " +
                        (lastException == null
                                ? "unknown"
                                : lastException.getClass().getSimpleName() + " - " + lastException.getMessage())
        );
    }

    private Question buildQuestion(InterviewSession session, Map<String, String> parsed) {
        return Question.builder()
                .text(parsed.get("text"))
                .type(QuestionSelectionService.mapToQuestionType(session.getType()))
                .industry(session.getIndustry())
                .difficulty(session.getTargetLevel())
                .expectedMethod(parsed.get("expectedMethod"))
                .sampleAnswer(parsed.get("sampleAnswer"))
                .isActive(true)
                .timesUsed(0)
                .build();
    }

    private String buildPrompt(InterviewSession session,
                               int askedCount,
                               String candidateContext,
                               int attempt,
                               String lastError) {
        String retryNote = "";
        if (attempt > 1 && lastError != null && !lastError.isBlank()) {
            retryNote = "\nRETRY " + attempt + "/" + MAX_ATTEMPTS +
                    " — previous attempt failed: " + lastError +
                    "\nFollow the output rules strictly.\n";
        }

        String candidateSection = (candidateContext == null || candidateContext.isBlank())
                ? ""
                : "CANDIDATE CONTEXT\n" + candidateContext + "\n\n";

        return String.format(
                "You are simulating a human recruiter in a live mock interview. Generate exactly ONE next question.%n" +
                        "%s%n" +
                        "SESSION PARAMETERS%n" +
                        "- Interview type : %s%n" +
                        "- Industry       : %s%n" +
                        "- Career level   : %s%n" +
                        "- Difficulty     : %d/10 (%s)%n" +
                        "- Questions already asked: %d%n%n" +
                        "%s" +
                        "QUESTION DESIGN RULES%n" +
                        "- Keep the question natural and conversational, as if spoken by a recruiter.%n" +
                        "- Make it fit the candidate context when available, but do not repeat the exact same topic twice.%n" +
                        "- The final text must be one direct spoken question ending with '?'.%n%n" +
                        "TYPE RULES%n%s%n%n" +
                        "OUTPUT RULES%n" +
                        "- Return ONLY valid JSON, no markdown, no text outside the JSON object%n" +
                        "- The type field must be exactly \"%s\"%n%n" +
                        "{%n" +
                        "  \"type\": \"%s\",%n" +
                        "  \"text\": \"the exact interview question ending with ?\",%n" +
                        "  \"expectedMethod\": \"how a strong answer should be structured (1-2 sentences)\",%n" +
                        "  \"sampleAnswer\": \"a concise excellent example answer (2-4 sentences)\"%n" +
                        "}%n",
                retryNote,
                typeLabel(session.getType()),
                industryLabel(session.getIndustry()),
                levelLabel(session.getTargetLevel()),
                session.getDifficultyLevel(),
                difficultyLabel(session.getDifficultyLevel()),
                askedCount,
                candidateSection,
                typeRules(session.getType()),
                session.getType().name(),
                session.getType().name()
        );
    }

    private String typeRules(InterviewTypeEnum type) {
        return switch (type) {
            case BEHAVIORAL ->
                    "- Ask ONLY about a real past experience.\n" +
                            "- Valid openers: 'Tell me about a time...', 'Describe a situation where...'\n" +
                            "- Answer must fit STAR (Situation, Task, Action, Result).\n" +
                            "- DO NOT ask a technical or hypothetical question.";
            case TECHNICAL ->
                    "- Ask ONLY about technical concepts, design, implementation, or trade-offs.\n" +
                            "- Valid openers: 'How would you design...', 'Explain...', 'Walk me through...'\n" +
                            "- DO NOT ask for a past-experience story.";
            case CASE_STUDY ->
                    "- Present a realistic business scenario with concrete numbers and a clear problem.\n" +
                            "- Ask the candidate to analyze, structure, and recommend.\n" +
                            "- Valid openers: 'Your client...', 'A company...', 'You are advising...'\n" +
                            "- DO NOT ask a pure behavioral or pure coding question.";
        };
    }

    private Map<String, String> parseModelOutput(String rawText, InterviewTypeEnum expectedType) {
        if (rawText == null || rawText.isBlank()) {
            throw new IllegalStateException("Groq returned empty response");
        }

        String cleaned = GroqClient.stripJsonFences(rawText).trim();
        String jsonCandidate = extractFirstJsonObject(cleaned);

        Map<String, String> parsed;
        if (jsonCandidate != null) {
            parsed = parseJsonLenient(jsonCandidate);
        } else {
            parsed = new HashMap<>();
            parsed.put("text", cleanupPlainText(cleaned));
        }

        if (parsed.get("text") == null || parsed.get("text").isBlank()) {
            throw new IllegalStateException("Groq response has no usable question text");
        }

        parsed.put("text", normalizeQuestionText(parsed.get("text")));

        if (parsed.get("type") == null || parsed.get("type").isBlank()) {
            parsed.put("type", expectedType.name());
        }
        if (parsed.get("expectedMethod") == null || parsed.get("expectedMethod").isBlank()) {
            parsed.put("expectedMethod", defaultExpectedMethod(expectedType));
        }
        if (parsed.get("sampleAnswer") == null || parsed.get("sampleAnswer").isBlank()) {
            parsed.put("sampleAnswer", defaultSampleAnswer(expectedType));
        }

        return parsed;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseJsonLenient(String json) {
        try {
            Map<String, Object> raw = objectMapper.readValue(json, Map.class);
            Map<String, String> parsed = new HashMap<>();
            for (Map.Entry<String, Object> entry : raw.entrySet()) {
                parsed.put(entry.getKey(), entry.getValue() == null ? null : String.valueOf(entry.getValue()));
            }
            return parsed;
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Groq returned invalid JSON: " + json.substring(0, Math.min(200, json.length())));
        }
    }

    private String extractFirstJsonObject(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return (start >= 0 && end > start) ? text.substring(start, end + 1) : null;
    }

    private void validateStructure(Map<String, String> parsed) {
        if (parsed.get("text") == null || parsed.get("text").isBlank()) {
            throw new IllegalStateException("Missing 'text' field in Groq response");
        }
    }

    private void validateTypeField(Map<String, String> parsed, InterviewTypeEnum expected) {
        String returned = parsed.get("type");
        if (returned == null || returned.isBlank() || !expected.name().equalsIgnoreCase(returned.trim())) {
            if (returned != null && !returned.isBlank()) {
                log.warn("Groq returned type='{}', overriding to '{}'", returned, expected.name());
            }
            parsed.put("type", expected.name());
        }
    }

    private String normalizeQuestionText(String text) {
        String cleaned = text.trim()
                .replaceFirst("(?i)^question\\s*:\\s*", "")
                .replaceFirst("(?i)^text\\s*:\\s*", "")
                .replaceAll("^\"|\"$", "")
                .trim();
        return cleaned.endsWith("?") ? cleaned : cleaned + "?";
    }

    private String cleanupPlainText(String text) {
        for (String line : text.split("\\R")) {
            String trimmed = line.trim();
            if (!trimmed.isBlank() && !trimmed.startsWith("{") && !trimmed.startsWith("}") && !trimmed.startsWith("```")) {
                return normalizeQuestionText(trimmed);
            }
        }
        throw new IllegalStateException("Cannot extract question text from Groq plain-text response");
    }

    private String defaultExpectedMethod(InterviewTypeEnum type) {
        return switch (type) {
            case BEHAVIORAL -> "Use the STAR method: Situation, Task, Action, Result.";
            case TECHNICAL -> "Clarify assumptions, explain the approach, discuss trade-offs, justify decisions.";
            case CASE_STUDY -> "Structure the problem, state assumptions, compare options, give a clear recommendation.";
        };
    }

    private String defaultSampleAnswer(InterviewTypeEnum type) {
        return switch (type) {
            case BEHAVIORAL -> "I would briefly describe the context, what I needed to achieve, the steps I took, and the measurable result.";
            case TECHNICAL -> "I would start by clarifying constraints, walk through the design, highlight trade-offs, and explain my reasoning.";
            case CASE_STUDY -> "I would frame the problem, identify key drivers, evaluate two or three options, and close with a data-backed recommendation.";
        };
    }

    private String typeLabel(InterviewTypeEnum type) {
        return switch (type) {
            case BEHAVIORAL -> "Behavioral";
            case TECHNICAL -> "Technical";
            case CASE_STUDY -> "Case Study";
        };
    }

    private String industryLabel(IndustryEnum industry) {
        if (industry == null) return "general";
        return industry.name().replace('_', ' ').toLowerCase();
    }

    private String levelLabel(CareerLevelEnum level) {
        if (level == null) return "mid-level";
        return switch (level) {
            case INTERN -> "intern";
            case JUNIOR -> "junior";
            case MID -> "mid-level";
            case SENIOR -> "senior";
            case LEAD -> "lead";
        };
    }

    private String difficultyLabel(Integer difficulty) {
        if (difficulty == null) return "medium";
        if (difficulty <= 3) return "easy";
        if (difficulty <= 6) return "medium";
        return "hard";
    }
}
