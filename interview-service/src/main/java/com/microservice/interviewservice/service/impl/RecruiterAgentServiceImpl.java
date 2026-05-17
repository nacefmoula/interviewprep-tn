package com.microservice.interviewservice.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.client.GroqClient;
import com.microservice.interviewservice.dto.ai.AiEvaluationResult;
import com.microservice.interviewservice.dto.live.AgentUtterance;
import com.microservice.interviewservice.dto.live.CandidateProfile;
import com.microservice.interviewservice.dto.live.ConversationTurn;
import com.microservice.interviewservice.ennum.LiveAgentMode;
import com.microservice.interviewservice.ennum.LiveInterviewPhase;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.service.BehavioralMetricsService;
import com.microservice.interviewservice.service.RecruiterAgentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecruiterAgentServiceImpl implements RecruiterAgentService {

    private final GroqClient groqClient;
    private final ObjectMapper objectMapper;

    @Override
    public AgentUtterance buildGreeting(InterviewSession session) {
        String industry = session.getIndustry() == null
                ? "general"
                : session.getIndustry().name().replace('_', ' ').toLowerCase(Locale.ROOT);
        String level = session.getTargetLevel() == null
                ? "mid-level"
                : session.getTargetLevel().name().toLowerCase(Locale.ROOT);

        String message = "Hi, I am your AI recruiter for a " + level + " " + industry
                + " interview. Let us begin with a quick introduction. Tell me about yourself, your background, and the kind of role you are targeting.";

        return new AgentUtterance(
                LiveAgentMode.INTRO,
                LiveInterviewPhase.SELF_INTRO_CAPTURE,
                message,
                null,
                true
        );
    }

    @Override
    public CandidateProfile extractProfile(InterviewSession session, String selfIntroductionTranscript) {
        if (selfIntroductionTranscript == null || selfIntroductionTranscript.isBlank()) {
            return fallbackProfile(selfIntroductionTranscript);
        }

        try {
            String prompt = """
                    You are extracting structured candidate profile information from a short interview self-introduction.
                    Return ONLY valid JSON.

                    Session context:
                    - Industry: %s
                    - Target level: %s
                    - Interview type: %s

                    Candidate self-introduction:
                    %s

                    JSON schema:
                    {
                      "candidateName": "string or empty",
                      "currentRole": "string or empty",
                      "targetRole": "string or empty",
                      "yearsOfExperience": "string or empty",
                      "keySkills": ["skill1", "skill2"],
                      "communicationStyle": "brief phrase",
                      "confidenceSummary": "brief phrase",
                      "shortBio": "one sentence summary"
                    }
                    """.formatted(
                    session.getIndustry(),
                    session.getTargetLevel(),
                    session.getType(),
                    trim(selfIntroductionTranscript, 2200)
            );

            String raw = groqClient.ask(prompt);
            String json = GroqClient.stripJsonFences(raw);
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(json, Map.class);
            List<String> skills = new ArrayList<>();
            Object keySkills = parsed.get("keySkills");
            if (keySkills instanceof List<?> list) {
                for (Object item : list) {
                    if (item != null) skills.add(String.valueOf(item));
                }
            }
            CandidateProfile profile = new CandidateProfile(
                    stringValue(parsed.get("candidateName")),
                    stringValue(parsed.get("currentRole")),
                    stringValue(parsed.get("targetRole")),
                    stringValue(parsed.get("yearsOfExperience")),
                    skills,
                    defaultIfBlank(stringValue(parsed.get("communicationStyle")), "clear but still warming up"),
                    defaultIfBlank(stringValue(parsed.get("confidenceSummary")), "shows some potential but is still settling in"),
                    defaultIfBlank(stringValue(parsed.get("shortBio")), trim(selfIntroductionTranscript, 220))
            );
            return normalize(profile, selfIntroductionTranscript);
        } catch (Exception ex) {
            log.warn("Profile extraction fallback used [sessionId={}, reason={}]", session.getId(), ex.getMessage());
            return fallbackProfile(selfIntroductionTranscript);
        }
    }

    @Override
    public AgentUtterance buildPostIntroPrompt(InterviewSession session,
                                               CandidateProfile profile,
                                               Question firstQuestion,
                                               List<ConversationTurn> history) {
        String name = safeName(profile);
        String message = "Thanks" + (name.isBlank() ? "" : ", " + name)
                + ". That gives me a good starting point. Let us move into the interview. "
                + firstQuestion.getText();

        return new AgentUtterance(
                LiveAgentMode.QUESTION,
                LiveInterviewPhase.WAITING_ANSWER,
                message,
                null,
                true
        );
    }

    @Override
    public AgentUtterance buildTurnResponse(InterviewSession session,
                                            CandidateProfile profile,
                                            Question currentQuestion,
                                            String transcript,
                                            AiEvaluationResult evaluation,
                                            BehavioralMetricsService.Metrics metrics,
                                            Question nextQuestion,
                                            boolean finished,
                                            List<ConversationTurn> history) {
        LiveAgentMode targetMode = chooseMode(evaluation, metrics, finished);
        try {
            String prompt = buildResponsePrompt(session, profile, currentQuestion, transcript, evaluation, metrics, nextQuestion, finished, history, targetMode);
            String raw = groqClient.ask(prompt);
            String json = GroqClient.stripJsonFences(raw);
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(json, Map.class);

            LiveAgentMode mode = parseMode(stringValue(parsed.get("agentMode")), targetMode);
            String message = defaultIfBlank(stringValue(parsed.get("message")), fallbackMessage(mode, profile, evaluation, metrics, nextQuestion, finished));
            String encouragement = blankToNull(stringValue(parsed.get("encouragement")));

            return new AgentUtterance(
                    mode,
                    finished ? LiveInterviewPhase.FINISHED : phaseFor(mode),
                    message,
                    encouragement,
                    true
            );
        } catch (Exception ex) {
            log.warn("Recruiter response fallback used [sessionId={}, reason={}]", session.getId(), ex.getMessage());
            LiveAgentMode mode = targetMode;
            return new AgentUtterance(
                    mode,
                    finished ? LiveInterviewPhase.FINISHED : phaseFor(mode),
                    fallbackMessage(mode, profile, evaluation, metrics, nextQuestion, finished),
                    fallbackEncouragement(mode, metrics),
                    true
            );
        }
    }

    private String buildResponsePrompt(InterviewSession session,
                                       CandidateProfile profile,
                                       Question currentQuestion,
                                       String transcript,
                                       AiEvaluationResult evaluation,
                                       BehavioralMetricsService.Metrics metrics,
                                       Question nextQuestion,
                                       boolean finished,
                                       List<ConversationTurn> history,
                                       LiveAgentMode targetMode) {
        String historyText = history == null || history.isEmpty()
                ? "No prior turns."
                : history.stream()
                .skip(Math.max(0, history.size() - 6))
                .map(turn -> turn.role() + ": " + turn.content())
                .collect(Collectors.joining("\n"));

        String nextQuestionText = nextQuestion == null ? "" : nextQuestion.getText();
        return """
                You are simulating a human recruiter in a live interview.
                Your next reply must sound warm, responsive, and natural.
                Use short spoken phrasing. Light hesitation markers like "hmm" or "alright" are allowed sparingly.
                Do not sound robotic. Do not overpraise. Do not output markdown.

                Session context:
                - Industry: %s
                - Level: %s
                - Interview type: %s

                Candidate profile:
                - Name: %s
                - Current role: %s
                - Target role: %s
                - Experience: %s
                - Skills: %s
                - Communication style: %s
                - Confidence summary: %s

                Conversation history:
                %s

                Current question:
                %s

                Candidate answer transcript:
                %s

                Metrics:
                - overallScore: %.2f
                - communicationScore: %.2f
                - hesitationScore: %.2f
                - stressProxyScore: %.2f
                - confidenceProxyScore: %.2f
                - targetMode: %s
                - sessionFinished: %s

                If sessionFinished is false and a next question exists, smoothly bridge to it.
                Next question text:
                %s

                Return ONLY valid JSON:
                {
                  "agentMode": "ENCOURAGE | PROBE | FEEDBACK | END | QUESTION",
                  "message": "one natural recruiter utterance, 1-3 sentences",
                  "encouragement": "optional short nudge or empty"
                }
                """.formatted(
                session.getIndustry(),
                session.getTargetLevel(),
                session.getType(),
                safeName(profile),
                blankIfNull(profile.currentRole()),
                blankIfNull(profile.targetRole()),
                blankIfNull(profile.yearsOfExperience()),
                profile.keySkills(),
                blankIfNull(profile.communicationStyle()),
                blankIfNull(profile.confidenceSummary()),
                historyText,
                currentQuestion == null ? "" : currentQuestion.getText(),
                trim(transcript, 2000),
                evaluation == null ? 0.0 : evaluation.overallScore(),
                metrics == null ? 0.0 : metrics.communicationScore(),
                metrics == null ? 0.0 : metrics.hesitationScore(),
                metrics == null ? 0.0 : metrics.stressProxyScore(),
                metrics == null ? 0.0 : metrics.confidenceProxyScore(),
                targetMode.name(),
                finished,
                nextQuestionText
        );
    }

    private LiveAgentMode chooseMode(AiEvaluationResult evaluation,
                                     BehavioralMetricsService.Metrics metrics,
                                     boolean finished) {
        if (finished) {
            return LiveAgentMode.END;
        } 
        double score = evaluation == null || evaluation == null ? 0.0 : evaluation.overallScore();
        double hesitation = metrics == null ? 0.0 : metrics.hesitationScore();
        double stress = metrics == null ? 0.0 : metrics.stressProxyScore();
        
        if (hesitation >= 0.55 || stress >= 0.60 || (score >= 0.30 && score <= 0.55)) {
            return LiveAgentMode.ENCOURAGE;
        }
        if (score >= 0.75) {
            return LiveAgentMode.PROBE;
        }
        return LiveAgentMode.FEEDBACK;
    }

    private LiveInterviewPhase phaseFor(LiveAgentMode mode) {
        return switch (mode) {
            case ENCOURAGE, FEEDBACK, PROBE, QUESTION -> LiveInterviewPhase.WAITING_ANSWER;
            case END -> LiveInterviewPhase.FINISHED;
            case INTRO, SELF_INTRO -> LiveInterviewPhase.SELF_INTRO_CAPTURE;
        };
    }

    private String fallbackMessage(LiveAgentMode mode,
                                   CandidateProfile profile,
                                   AiEvaluationResult evaluation,
                                   BehavioralMetricsService.Metrics metrics,
                                   Question nextQuestion,
                                   boolean finished) {
        String nextText = nextQuestion == null ? "" : " " + nextQuestion.getText();
        return switch (mode) {
            case ENCOURAGE -> "You are close. Take a second, think it through, and keep going." + nextText;
            case PROBE -> "Good direction. Let us go one layer deeper." + nextText;
            case END -> "Alright, that wraps up the interview. I will prepare your feedback report now.";
            case QUESTION -> nextQuestion == null ? "Let us continue." : "Alright, let us continue. " + nextQuestion.getText();
            case FEEDBACK -> {
                double score =  evaluation == null ? 0.0 : evaluation.overallScore() ;
                if (score >= 0.55) {
                    yield "Nice. You covered the main idea. Let us move to the next question." + nextText;
                }
                yield "You touched part of it, but I want a bit more precision. Let us keep moving." + nextText;
            }
            case INTRO, SELF_INTRO -> "Tell me a bit about yourself.";
        };
    }

    private String fallbackEncouragement(LiveAgentMode mode, BehavioralMetricsService.Metrics metrics) {
        if (mode != LiveAgentMode.ENCOURAGE) {
            return null;
        }
        double hesitation = metrics == null ? 0.0 : metrics.hesitationScore();
        return hesitation >= 0.65 ? "Take your time, you are very close." : "Go on, you are on the right track.";
    }

    private CandidateProfile fallbackProfile(String transcript) {
        return new CandidateProfile(
                guessName(transcript),
                "",
                "",
                "",
                List.of(),
                "clear but still warming up",
                "shows some potential but may be slightly tense",
                transcript == null ? "" : trim(transcript, 220)
        );
    }

    private CandidateProfile normalize(CandidateProfile profile, String transcript) {
        return new CandidateProfile(
                defaultIfBlank(profile.candidateName(), guessName(transcript)),
                blankToNull(profile.currentRole()),
                blankToNull(profile.targetRole()),
                blankToNull(profile.yearsOfExperience()),
                profile.keySkills() == null ? List.of() : profile.keySkills().stream()
                        .filter(skill -> skill != null && !skill.isBlank())
                        .limit(8)
                        .toList(),
                defaultIfBlank(profile.communicationStyle(), "clear but still warming up"),
                defaultIfBlank(profile.confidenceSummary(), "shows some potential but may be slightly tense"),
                defaultIfBlank(profile.shortBio(), transcript == null ? "" : trim(transcript, 220))
        );
    }

    private LiveAgentMode parseMode(String raw, LiveAgentMode fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return LiveAgentMode.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private String guessName(String transcript) {
        if (transcript == null || transcript.isBlank()) return "";
        String lower = transcript.toLowerCase(Locale.ROOT);
        int idx = lower.indexOf("my name is ");
        if (idx >= 0) {
            String value = transcript.substring(idx + "my name is ".length()).trim();
            return value.split("[,. ]", 2)[0];
        }
        idx = lower.indexOf("i am ");
        if (idx >= 0) {
            String value = transcript.substring(idx + "i am ".length()).trim();
            String first = value.split("[,. ]", 2)[0];
            if (first.length() > 1 && Character.isUpperCase(first.charAt(0))) {
                return first;
            }
        }
        return "";
    }

    private String safeName(CandidateProfile profile) {
        return profile == null ? "" : defaultIfBlank(profile.candidateName(), "");
    }

    private String trim(String text, int max) {
        if (text == null) return "";
        return text.length() > max ? text.substring(0, max) + "…" : text;
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String blankIfNull(String value) {
        return value == null ? "" : value;
    }
}
