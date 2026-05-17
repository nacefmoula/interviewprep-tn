package com.microservice.interviewservice.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.dto.ai.AiEvaluationResult;
import com.microservice.interviewservice.dto.live.AgentUtterance;
import com.microservice.interviewservice.dto.live.CandidateProfile;
import com.microservice.interviewservice.dto.live.CommitTurnRequest;
import com.microservice.interviewservice.dto.live.ConversationTurn;
import com.microservice.interviewservice.dto.live.LiveActionResponse;
import com.microservice.interviewservice.dto.live.LiveStartResponse;
import com.microservice.interviewservice.dto.live.LiveStatusResponse;
import com.microservice.interviewservice.dto.live.LiveTimelinePoint;
import com.microservice.interviewservice.ennum.LiveAgentMode;
import com.microservice.interviewservice.ennum.LiveInterviewPhase;
import com.microservice.interviewservice.ennum.LiveSessionStatus;
import com.microservice.interviewservice.ennum.SessionStatusEnum;
import com.microservice.interviewservice.exception.BusinessException;
import com.microservice.interviewservice.exception.ResourceNotFoundException;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.LiveInterviewSession;
import com.microservice.interviewservice.model.PerformanceReport;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.model.Response;
import com.microservice.interviewservice.repository.InterviewSessionRepository;
import com.microservice.interviewservice.repository.LiveInterviewSessionRepository;
import com.microservice.interviewservice.repository.QuestionRepository;
import com.microservice.interviewservice.repository.ResponseRepository;
import com.microservice.interviewservice.service.AiEvaluationService;
import com.microservice.interviewservice.service.AiQuestionService;
import com.microservice.interviewservice.service.BehavioralMetricsService;
import com.microservice.interviewservice.service.LiveInterviewService;
import com.microservice.interviewservice.service.RecruiterAgentService;
import com.microservice.interviewservice.service.ReportGenerationService;
import com.microservice.interviewservice.service.SpeechToTextService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class LiveInterviewServiceImpl implements LiveInterviewService {

    private static final TypeReference<List<ConversationTurn>> HISTORY_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<LiveTimelinePoint>> TIMELINE_TYPE = new TypeReference<>() {};

    private final InterviewSessionRepository sessionRepository;
    private final LiveInterviewSessionRepository liveRepository;
    private final QuestionRepository questionRepository;
    private final ResponseRepository responseRepository;
    private final AiQuestionService aiQuestionService;
    private final AiEvaluationService aiEvaluationService;
    private final SpeechToTextService speechToTextService;
    private final BehavioralMetricsService behavioralMetricsService;
    private final ReportGenerationService reportGenerationService;
    private final RecruiterAgentService recruiterAgentService;
    private final ObjectMapper objectMapper;

    @Value("${app.live.max-questions-default:6}")
    private int defaultMaxQuestions;

    @Value("${app.live.use-neural-tts:true}")
    private boolean useNeuralTts;

    @Override
    public LiveStartResponse start(Long sessionId, String userId) {
        InterviewSession session = getOwnedSession(sessionId, userId);
        if (session.getStatus() == SessionStatusEnum.CANCELLED || session.getStatus() == SessionStatusEnum.COMPLETED) {
            throw new BusinessException("This session is already finished.");
        }

        LiveInterviewSession live = liveRepository.findByInterviewSessionId(sessionId).orElse(null);
        if (live == null) {
            AgentUtterance greeting = recruiterAgentService.buildGreeting(session);
            return persistFreshStart(sessionId, session, greeting);
        }

        normalizeLiveState(live);
        Question currentQuestion = findQuestion(live.getCurrentQuestionId());
        return new LiveStartResponse(
                sessionId,
                live.getAnsweredCount(),
                live.getMaxQuestions(),
                currentQuestion,
                live.getStatus(),
                live.getPhase(),
                live.getAgentMode(),
                live.getPhase() == LiveInterviewPhase.SELF_INTRO_CAPTURE ? live.getLastAgentMessage() : null,
                live.getLastAgentMessage(),
                useNeuralTts
        );
    }

    @Transactional
    protected LiveStartResponse persistFreshStart(Long sessionId,
                                                  InterviewSession session,
                                                  AgentUtterance greeting) {
        session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session disappeared."));

        if (session.getStatus() == SessionStatusEnum.PAUSED) {
            session.resume();
            sessionRepository.save(session);
        }

        LiveInterviewSession live = liveRepository.save(
                LiveInterviewSession.builder()
                        .interviewSession(session)
                        .status(LiveSessionStatus.ACTIVE)
                        .phase(greeting.phase())
                        .agentMode(greeting.agentMode())
                        .currentQuestionId(null)
                        .answeredCount(0)
                        .maxQuestions(resolveMaxQuestions(session))
                        .lastAgentMessage(greeting.message())
                        .conversationHistoryJson(writeHistory(List.of(new ConversationTurn("assistant", greeting.message()))))
                        .build()
        );

        return new LiveStartResponse(
                sessionId,
                live.getAnsweredCount(),
                live.getMaxQuestions(),
                null,
                live.getStatus(),
                live.getPhase(),
                live.getAgentMode(),
                greeting.message(),
                greeting.message(),
                useNeuralTts
        );
    }

    @Override
    @Transactional(readOnly = true)
    public LiveStatusResponse getStatus(Long sessionId, String userId) {
        getOwnedSession(sessionId, userId);
        LiveInterviewSession live = liveRepository.findByInterviewSessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live interview not started."));

        normalizeLiveState(live);
        return new LiveStatusResponse(
                sessionId,
                live.getStatus(),
                live.getAnsweredCount(),
                live.getMaxQuestions(),
                findQuestion(live.getCurrentQuestionId()),
                live.getPhase(),
                live.getAgentMode(),
                live.getLastAgentMessage()
        );
    }
@Override
@Transactional
    public LiveActionResponse commitTurn(Long sessionId, CommitTurnRequest request, String userId) {
        InterviewSession session = getOwnedSession(sessionId, userId);
        LiveInterviewSession live = liveRepository.findByInterviewSessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live interview not started."));

        normalizeLiveState(live);
        if (live.getStatus() != LiveSessionStatus.ACTIVE) {
            throw new BusinessException("Live interview is not active.");
        }

        String transcript = resolveTranscript(request, session);
        BehavioralMetricsService.Metrics metrics = behavioralMetricsService.compute(
                transcript,
                request.durationSeconds(),
                request.audioMetrics(),
                request.faceMetrics()
        );
        List<LiveTimelinePoint> currentTimeline = normalizeTimeline(request, metrics);

        if (live.getPhase() == LiveInterviewPhase.SELF_INTRO_CAPTURE || live.getCurrentQuestionId() == null) {
            return handleSelfIntroduction(sessionId, session, live, transcript, request, currentTimeline);
        }

        if (request.questionId() == null || !request.questionId().equals(live.getCurrentQuestionId())) {
            throw new BusinessException("Submitted question does not match the current live question.");
        }

        Question currentQuestion = questionRepository.findById(request.questionId())
                .orElseThrow(() -> new ResourceNotFoundException("Question not found."));

        AiEvaluationResult evaluation = aiEvaluationService.evaluate(currentQuestion, transcript);
        int newAnsweredCount = live.getAnsweredCount() + 1;
        boolean finished = newAnsweredCount >= live.getMaxQuestions();

        CandidateProfile profile = readProfile(live.getCandidateProfileJson());
        List<ConversationTurn> history = readHistory(live.getConversationHistoryJson());
        history.add(new ConversationTurn("user", transcript));

        Question nextQuestion = null;
        if (!finished) {
            List<Long> askedIds = responseRepository.findQuestionIdsBySessionId(sessionId);
            nextQuestion = aiQuestionService.generateQuestion(
                    session,
                    askedIds,
                    buildCandidateQuestionContext(profile, history)
            );
        }

        AgentUtterance utterance = recruiterAgentService.buildTurnResponse(
                session,
                profile,
                currentQuestion,
                transcript,
                evaluation,
                metrics,
                nextQuestion,
                finished,
                history
        );
        history.add(new ConversationTurn("assistant", utterance.message()));

        return persistTurnAndBuildResponse(
                sessionId,
                session,
                live,
                currentQuestion,
                transcript,
                request,
                evaluation,
                metrics,
                currentTimeline,
                newAnsweredCount,
                finished,
                nextQuestion,
                utterance,
                history
        );
    }

    private LiveActionResponse handleSelfIntroduction(Long sessionId,
                                                      InterviewSession session,
                                                      LiveInterviewSession live,
                                                      String transcript,
                                                      CommitTurnRequest request,
                                                      List<LiveTimelinePoint> currentTimeline) {
        CandidateProfile profile = recruiterAgentService.extractProfile(session, transcript);
        List<ConversationTurn> history = readHistory(live.getConversationHistoryJson());
        history.add(new ConversationTurn("user", transcript));

        List<Long> askedIds = responseRepository.findQuestionIdsBySessionId(sessionId);
        Question firstQuestion = aiQuestionService.generateQuestion(
                session,
                askedIds,
                buildCandidateQuestionContext(profile, history)
        );
        AgentUtterance utterance = recruiterAgentService.buildPostIntroPrompt(session, profile, firstQuestion, history);
        history.add(new ConversationTurn("assistant", utterance.message()));

        return persistSelfIntroductionAndBuildResponse(
                sessionId,
                transcript,
                live,
                profile,
                firstQuestion,
                utterance,
                history,
                currentTimeline
        );
    }

    @Transactional
    protected LiveActionResponse persistSelfIntroductionAndBuildResponse(Long sessionId,
                                                                         String transcript,
                                                                         LiveInterviewSession live,
                                                                         CandidateProfile profile,
                                                                         Question firstQuestion,
                                                                         AgentUtterance utterance,
                                                                         List<ConversationTurn> history,
                                                                         List<LiveTimelinePoint> currentTimeline) {
        live = liveRepository.findByInterviewSessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live session disappeared."));
        normalizeLiveState(live);

        live.setSelfIntroTranscript(transcript);
        live.setCandidateProfileJson(writeJson(profile));
        live.setCurrentQuestionId(firstQuestion.getId());
        live.setPhase(utterance.phase());
        live.setAgentMode(utterance.agentMode());
        live.setLastAgentMessage(utterance.message());
        live.setConversationHistoryJson(writeHistory(history));
        live.setStressTimelineJson(writeJson(appendTimeline(readTimeline(live.getStressTimelineJson()), currentTimeline)));
        liveRepository.save(live);

        return new LiveActionResponse(
                false,
                transcript,
                null,
                null,
                null,
                null,
                null,
                "Self introduction captured.",
                firstQuestion,
                null,
                utterance.phase(),
                utterance.agentMode(),
                utterance.message(),
                utterance.encouragement(),
                utterance.shouldSpeak(),
                currentTimeline
        );
    }

    @Transactional
    protected LiveActionResponse persistTurnAndBuildResponse(Long sessionId,
                                                             InterviewSession session,
                                                             LiveInterviewSession live,
                                                             Question currentQuestion,
                                                             String transcript,
                                                             CommitTurnRequest request,
                                                             AiEvaluationResult evaluation,
                                                             BehavioralMetricsService.Metrics metrics,
                                                             List<LiveTimelinePoint> currentTimeline,
                                                             int newAnsweredCount,
                                                             boolean finished,
                                                             Question nextQuestion,
                                                             AgentUtterance utterance,
                                                             List<ConversationTurn> history) {
        session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session disappeared."));
        live = liveRepository.findByInterviewSessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live session disappeared."));
        normalizeLiveState(live);

        Response response = Response.builder()
                .session(session)
                .question(currentQuestion)
                .transcription(transcript)
                .durationSeconds(request.durationSeconds())
                .wordCount(countWords(transcript))
                .overallScore(evaluation.overallScore())
                .aiFeedback(evaluation.feedback())
                .turnIndex(newAnsweredCount)
                .communicationScore(metrics.communicationScore())
                .hesitationScore(metrics.hesitationScore())
                .stressProxyScore(metrics.stressProxyScore())
                .confidenceProxyScore(metrics.confidenceProxyScore())
                .avgVolume(request.audioMetrics() == null ? null : request.audioMetrics().averageVolume())
                .maxVolume(request.audioMetrics() == null ? null : request.audioMetrics().maxVolume())
                .silenceRatio(request.audioMetrics() == null ? null : request.audioMetrics().silenceRatio())
                .blinkRate(request.faceMetrics() == null ? null : request.faceMetrics().blinkRate())
                .gazeStabilityScore(request.faceMetrics() == null ? null : request.faceMetrics().gazeStabilityScore())
                .headMotionScore(request.faceMetrics() == null ? null : request.faceMetrics().headMotionScore())
                .browTensionScore(request.faceMetrics() == null ? null : request.faceMetrics().browTensionScore())
                .mouthTensionScore(request.faceMetrics() == null ? null : request.faceMetrics().mouthTensionScore())
                .reactionType(utterance.agentMode().name())
                .agentMessage(utterance.message())
                .encouragement(utterance.encouragement())
                .stressTimelineJson(writeJson(currentTimeline))
                .build();

        responseRepository.save(response);
        questionRepository.incrementTimesUsed(currentQuestion.getId());
        adaptDifficulty(session, evaluation.overallScore());

        live.setAnsweredCount(newAnsweredCount);
        live.setAgentMode(utterance.agentMode());
        live.setPhase(utterance.phase());
        live.setLastAgentMessage(utterance.message());
        live.setConversationHistoryJson(writeHistory(history));
        live.setStressTimelineJson(writeJson(appendTimeline(readTimeline(live.getStressTimelineJson()), currentTimeline)));

        if (finished) {
            session.end();
            sessionRepository.save(session);
            live.setStatus(LiveSessionStatus.FINISHED);
            live.setCurrentQuestionId(null);
            live.setPhase(LiveInterviewPhase.FINISHED);
            liveRepository.save(live);

            PerformanceReport report = reportGenerationService.generateForSession(sessionId);
            return new LiveActionResponse(
                    true,
                    transcript,
                    evaluation.overallScore(),
                    metrics.communicationScore(),
                    metrics.hesitationScore(),
                    metrics.stressProxyScore(),
                    metrics.confidenceProxyScore(),
                    evaluation.feedback(),
                    null,
                    report.getId(),
                    LiveInterviewPhase.FINISHED,
                    utterance.agentMode(),
                    utterance.message(),
                    utterance.encouragement(),
                    utterance.shouldSpeak(),
                    currentTimeline
            );
        }

        live.setCurrentQuestionId(nextQuestion.getId());
        liveRepository.save(live);

        return new LiveActionResponse(
                false,
                transcript,
                evaluation.overallScore(),
                metrics.communicationScore(),
                metrics.hesitationScore(),
                metrics.stressProxyScore(),
                metrics.confidenceProxyScore(),
                evaluation.feedback(),
                nextQuestion,
                null,
                utterance.phase(),
                utterance.agentMode(),
                utterance.message(),
                utterance.encouragement(),
                utterance.shouldSpeak(),
                currentTimeline
        );
    }

    @Override
    @Transactional
    public PerformanceReport end(Long sessionId, String userId) {
        InterviewSession session = getOwnedSession(sessionId, userId);
        LiveInterviewSession live = liveRepository.findByInterviewSessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live interview not started."));

        normalizeLiveState(live);
        if (session.getStatus() != SessionStatusEnum.COMPLETED) {
            session.end();
            sessionRepository.save(session);
        }

        live.setStatus(LiveSessionStatus.FINISHED);
        live.setCurrentQuestionId(null);
        live.setPhase(LiveInterviewPhase.FINISHED);
        live.setAgentMode(LiveAgentMode.END);
        live.setLastAgentMessage("Alright, that wraps up the interview. I am preparing your report now.");
        liveRepository.save(live);

        return reportGenerationService.generateForSession(sessionId);
    }

    private InterviewSession getOwnedSession(Long sessionId, String userId) {
        return sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview session not found [id=" + sessionId + "]"));
    }

    private void normalizeLiveState(LiveInterviewSession live) {
        if (live.getPhase() == null) {
            live.setPhase(live.getCurrentQuestionId() == null ? LiveInterviewPhase.SELF_INTRO_CAPTURE : LiveInterviewPhase.WAITING_ANSWER);
        }
        if (live.getAgentMode() == null) {
            live.setAgentMode(live.getCurrentQuestionId() == null ? LiveAgentMode.INTRO : LiveAgentMode.QUESTION);
        }
    }

    private Question findQuestion(Long questionId) {
        if (questionId == null) return null;
        return questionRepository.findById(questionId).orElse(null);
    }

    private int resolveMaxQuestions(InterviewSession session) {
        if (session.getDurationMinutes() == null) return defaultMaxQuestions;
        int byDuration = Math.max(4, Math.min(10, session.getDurationMinutes() / 6));
        return byDuration;
    }

    private void adaptDifficulty(InterviewSession session, double score) {
        Integer current = session.getDifficultyLevel() == null ? 3 : session.getDifficultyLevel();
        if (score >= 0.80 && current < 5) {
            session.setDifficultyLevel(current + 1);
        } else if (score <= 0.40 && current > 1) {
            session.setDifficultyLevel(current - 1);
        }
        sessionRepository.save(session);
    }

    private int countWords(String transcript) {
        if (transcript == null || transcript.isBlank()) return 0;
        return transcript.trim().split("\\s+").length;
    }

    private String resolveTranscript(CommitTurnRequest request, InterviewSession session) {
        String transcript = speechToTextService.transcribeBase64Pcm16(
                request.pcm16Base64(),
                session.getLanguage()
        );
        if (transcript != null && !transcript.isBlank()) {
            return transcript;
        }
        if (request.partialTranscript() != null && !request.partialTranscript().isBlank()) {
            return request.partialTranscript().trim();
        }
        return "";
    }

    private List<LiveTimelinePoint> normalizeTimeline(CommitTurnRequest request,
                                                      BehavioralMetricsService.Metrics metrics) {
        List<LiveTimelinePoint> source = request.stressTimeline();
        if ((source == null || source.isEmpty()) && request.faceMetrics() != null) {
            source = request.faceMetrics().stressTimeline();
        }
        if (source != null && !source.isEmpty()) {
            return source.stream()
                    .map(point -> new LiveTimelinePoint(
                            point.t(),
                            point.stress(),
                            point.confidence(),
                            point.hesitation(),
                            point.volume(),
                            point.speaking()
                    ))
                    .toList();
        }
        return List.of(new LiveTimelinePoint(
                0.0,
                metrics.stressProxyScore(),
                metrics.confidenceProxyScore(),
                metrics.hesitationScore(),
                request.audioMetrics() == null ? null : request.audioMetrics().averageVolume(),
                Boolean.TRUE
        ));
    }

    private CandidateProfile readProfile(String json) {
        if (json == null || json.isBlank()) {
            return new CandidateProfile("", "", "", "", List.of(), "", "", "");
        }
        try {
            return objectMapper.readValue(json, CandidateProfile.class);
        } catch (Exception ex) {
            log.warn("Unable to parse candidate profile JSON. Using blank profile. [reason={}]", ex.getMessage());
            return new CandidateProfile("", "", "", "", List.of(), "", "", "");
        }
    }

    private List<ConversationTurn> readHistory(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return new ArrayList<>(objectMapper.readValue(json, HISTORY_TYPE));
        } catch (Exception ex) {
            log.warn("Unable to parse conversation history JSON. Resetting history. [reason={}]", ex.getMessage());
            return new ArrayList<>();
        }
    }

    private String writeHistory(List<ConversationTurn> history) {
        if (history == null) {
            return "[]";
        }
        List<ConversationTurn> trimmed = history.size() <= 12
                ? history
                : history.subList(history.size() - 12, history.size());
        return writeJson(trimmed);
    }

    private List<LiveTimelinePoint> readTimeline(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return new ArrayList<>(objectMapper.readValue(json, TIMELINE_TYPE));
        } catch (Exception ex) {
            log.warn("Unable to parse stress timeline JSON. Resetting timeline. [reason={}]", ex.getMessage());
            return new ArrayList<>();
        }
    }

    private List<LiveTimelinePoint> appendTimeline(List<LiveTimelinePoint> existing,
                                                   List<LiveTimelinePoint> addition) {
        if (existing == null) existing = new ArrayList<>();
        if (addition == null || addition.isEmpty()) return existing;

        double offset = existing.isEmpty()
                ? 0.0
                : existing.get(existing.size() - 1).t() == null ? 0.0 : existing.get(existing.size() - 1).t();

        List<LiveTimelinePoint> merged = new ArrayList<>(existing);
        for (LiveTimelinePoint point : addition) {
            double t = point.t() == null ? 0.0 : point.t();
            merged.add(new LiveTimelinePoint(
                    offset + t,
                    point.stress(),
                    point.confidence(),
                    point.hesitation(),
                    point.volume(),
                    point.speaking()
            ));
        }
        return merged;
    }

    private String buildCandidateQuestionContext(CandidateProfile profile,
                                                 List<ConversationTurn> history) {
        StringBuilder builder = new StringBuilder();
        if (profile != null) {
            if (profile.candidateName() != null && !profile.candidateName().isBlank()) {
                builder.append("- Candidate name: ").append(profile.candidateName()).append('\n');
            }
            if (profile.currentRole() != null && !profile.currentRole().isBlank()) {
                builder.append("- Current role: ").append(profile.currentRole()).append('\n');
            }
            if (profile.targetRole() != null && !profile.targetRole().isBlank()) {
                builder.append("- Target role: ").append(profile.targetRole()).append('\n');
            }
            if (profile.yearsOfExperience() != null && !profile.yearsOfExperience().isBlank()) {
                builder.append("- Experience: ").append(profile.yearsOfExperience()).append('\n');
            }
            if (profile.keySkills() != null && !profile.keySkills().isEmpty()) {
                builder.append("- Key skills: ").append(String.join(", ", profile.keySkills())).append('\n');
            }
            if (profile.shortBio() != null && !profile.shortBio().isBlank()) {
                builder.append("- Bio summary: ").append(profile.shortBio()).append('\n');
            }
        }
        if (history != null && !history.isEmpty()) {
            List<ConversationTurn> recent = history.size() <= 4
                    ? history
                    : history.subList(history.size() - 4, history.size());
            builder.append("- Recent conversation:\n");
            for (ConversationTurn turn : recent) {
                builder.append("  * ").append(turn.role()).append(": ")
                        .append(turn.content()).append('\n');
            }
        }
        return builder.toString();
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Collections.emptyList() : value);
        } catch (Exception ex) {
            log.warn("Unable to write JSON payload. [reason={}]", ex.getMessage());
            return "[]";
        }
    }
}
