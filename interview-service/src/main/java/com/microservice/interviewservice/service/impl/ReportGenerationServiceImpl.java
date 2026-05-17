package com.microservice.interviewservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.client.GroqClient;
import com.microservice.interviewservice.dto.live.LiveTimelinePoint;
import com.microservice.interviewservice.ennum.PreparationLevelEnum;
import com.microservice.interviewservice.exception.ResourceNotFoundException;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.PerformanceReport;
import com.microservice.interviewservice.model.Response;
import com.microservice.interviewservice.repository.InterviewSessionRepository;
import com.microservice.interviewservice.repository.PerformanceReportRepository;
import com.microservice.interviewservice.repository.ResponseRepository;
import com.microservice.interviewservice.service.ReportGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ReportGenerationServiceImpl implements ReportGenerationService {

    private static final TypeReference<List<LiveTimelinePoint>> TIMELINE_TYPE = new TypeReference<>() {};

    private final InterviewSessionRepository sessionRepository;
    private final ResponseRepository responseRepository;
    private final PerformanceReportRepository reportRepository;
    private final GroqClient anthropicClient;
    private final ObjectMapper objectMapper;

    @Override
    public PerformanceReport generateForSession(Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Session not found [id=" + sessionId + "]"));

        List<Response> responses = responseRepository.findBySessionIdOrderByRecordedAtAsc(sessionId);

        double avgScore = responses.stream()
                .filter(r -> r.getOverallScore() != null)
                .mapToDouble(Response::getOverallScore)
                .average()
                .orElse(0.0);

        double communication = avgMetricOrFallback(
                responses.stream().map(Response::getCommunicationScore).toList(),
                clamp(avgScore * 1.05)
        );

        double contentQuality = clamp(avgScore * 0.95);

        double stressProxy = avgMetricOrFallback(
                responses.stream().map(Response::getStressProxyScore).toList(),
                0.50
        );

        double stressManagement = clamp(1.0 - stressProxy);

        double confidence = avgMetricOrFallback(
                responses.stream().map(Response::getConfidenceProxyScore).toList(),
                clamp(avgScore * 1.10)
        );

        double hesitation = avgMetricOrFallback(
                responses.stream().map(Response::getHesitationScore).toList(),
                0.35
        );

        List<LiveTimelinePoint> sessionTimeline = aggregateTimeline(responses);
        double peakStress = sessionTimeline.stream()
                .map(LiveTimelinePoint::stress)
                .filter(v -> v != null)
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(stressProxy);

        double globalScore = (communication + contentQuality + stressManagement + confidence) / 4.0;
        PreparationLevelEnum level = determineLevel(globalScore);
        int estimatedSessions = estimateSessionsToNextLevel(level);
        AiNarrative narrative = generateNarrative(session, responses, globalScore, level);

        PerformanceReport report = reportRepository.findBySessionId(sessionId)
                .orElseGet(() -> PerformanceReport.builder().session(session).build());

        report.setGlobalScore(round(globalScore));
        report.setCommunicationScore(round(communication));
        report.setContentQualityScore(round(contentQuality));
        report.setStressManagementScore(round(stressManagement));
        report.setConfidenceScore(round(confidence));
        report.setHesitationScore(round(hesitation));
        report.setStressProxyScore(round(stressProxy));
        report.setPreparationLevel(level);
        report.setTopStrengths(narrative.strengths());
        report.setAreasForImprovement(narrative.improvements());
        report.setActionableRecommendations(narrative.recommendations());
        report.setEstimatedSessionsToNextLevel(estimatedSessions);
        report.setCommunicationSummary("Communication score is based on pace, structure, silence ratio, and gaze stability proxies.");
        report.setStressProxySummary("Stress proxy is based on silence ratio, brow or mouth tension proxies, head motion, and gaze stability.");
        report.setBehavioralSummary(
                "Hesitation=" + round(hesitation) +
                        ", Stress proxy=" + round(stressProxy) +
                        ", Peak stress=" + round(peakStress) +
                        ", Confidence proxy=" + round(confidence)
        );
        report.setStressTimelineJson(writeTimeline(sessionTimeline));

        PerformanceReport saved = reportRepository.save(report);
        log.info("PerformanceReport generated [sessionId={}, globalScore={}, level={}]",
                sessionId, saved.getGlobalScore(), saved.getPreparationLevel());
        return saved;
    }

    private double avgMetricOrFallback(List<Double> values, double fallback) {
        return values.stream()
                .filter(v -> v != null)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(fallback);
    }

    private AiNarrative generateNarrative(InterviewSession session,
                                          List<Response> responses,
                                          double globalScore,
                                          PreparationLevelEnum level) {
        try {
            String prompt = buildNarrativePrompt(session, responses, globalScore, level);
            String raw = anthropicClient.ask(prompt);
            String json = GroqClient.stripJsonFences(raw);
            return parseNarrative(json);
        } catch (Exception ex) {
            log.warn("AI narrative generation failed, using formula fallback [sessionId={}, reason={}]",
                    session.getId(), ex.getMessage());
            return formulaFallback(globalScore, level);
        }
    }

    private String buildNarrativePrompt(InterviewSession session,
                                        List<Response> responses,
                                        double globalScore,
                                        PreparationLevelEnum level) {

        String feedbackSummary = responses.stream()
                .filter(r -> r.getAiFeedback() != null && !r.getAiFeedback().isBlank())
                .limit(5)
                .map(r -> "Q: " + r.getQuestion().getText() + "\nFeedback: " + r.getAiFeedback())
                .collect(Collectors.joining("\n\n"));

        double avgStress = avgMetricOrFallback(
                responses.stream().map(Response::getStressProxyScore).toList(), 0.50);

        double avgHesitation = avgMetricOrFallback(
                responses.stream().map(Response::getHesitationScore).toList(), 0.35);

        double avgCommunication = avgMetricOrFallback(
                responses.stream().map(Response::getCommunicationScore).toList(), 0.60);

        return """
                You are an expert interview coach writing a post-session performance report.

                Candidate context:
                - Industry:          %s
                - Target level:      %s
                - Interview type:    %s
                - Overall score:     %.2f / 1.0
                - Preparation level: %s
                - Communication:     %.2f / 1.0
                - Hesitation:        %.2f / 1.0
                - Stress proxy:      %.2f / 1.0

                Per-question coaching notes from this session:
                %s

                Write a personalised, actionable report in the second person.
                Be specific. Mention both content quality and delivery quality.

                Respond ONLY with valid JSON:
                {
                  "strengths":        "2-3 sentences",
                  "improvements":     "2-3 sentences",
                  "recommendations":  "2-3 concrete next steps"
                }
                """.formatted(
                session.getIndustry(),
                session.getTargetLevel(),
                session.getType(),
                globalScore,
                level,
                avgCommunication,
                avgHesitation,
                avgStress,
                feedbackSummary.isBlank() ? "No per-question notes available." : feedbackSummary
        );
    }

    @SuppressWarnings("unchecked")
    private AiNarrative parseNarrative(String json) throws Exception {
        Map<String, String> parsed = objectMapper.readValue(json, Map.class);
        return new AiNarrative(
                parsed.getOrDefault("strengths", "Strong performance overall."),
                parsed.getOrDefault("improvements", "Continue to refine your answers."),
                parsed.getOrDefault("recommendations", "Practice regularly to maintain your level.")
        );
    }

    private AiNarrative formulaFallback(double avgScore, PreparationLevelEnum level) {
        return new AiNarrative(
                buildStrengths(clamp(avgScore * 1.05), clamp(avgScore * 0.95), clamp(avgScore * 1.10)),
                buildImprovements(clamp(avgScore * 1.05), clamp(avgScore * 0.95), clamp(avgScore * 1.00)),
                buildRecommendations(level)
        );
    }

    private PreparationLevelEnum determineLevel(double score) {
        if (score >= 0.80) return PreparationLevelEnum.EXPERT;
        if (score >= 0.65) return PreparationLevelEnum.ADVANCED;
        if (score >= 0.45) return PreparationLevelEnum.INTERMEDIATE;
        return PreparationLevelEnum.BEGINNER;
    }

    private int estimateSessionsToNextLevel(PreparationLevelEnum level) {
        return switch (level) {
            case BEGINNER -> 8;
            case INTERMEDIATE -> 5;
            case ADVANCED -> 3;
            case EXPERT -> 0;
        };
    }

    private String buildStrengths(double comm, double content, double confidence) {
        StringBuilder sb = new StringBuilder();
        if (comm > 0.65) sb.append("Clear communication skills. ");
        if (content > 0.60) sb.append("Good answer structure and content depth. ");
        if (confidence > 0.70) sb.append("Strong confidence and delivery. ");
        return sb.isEmpty() ? "Showing early potential — keep practicing." : sb.toString().trim();
    }

    private String buildImprovements(double comm, double content, double stress) {
        StringBuilder sb = new StringBuilder();
        if (comm < 0.50) sb.append("Work on articulating ideas more clearly. ");
        if (content < 0.50) sb.append("Develop deeper answers using the STAR method. ");
        if (stress < 0.50) sb.append("Practice managing response time under pressure. ");
        return sb.isEmpty() ? "Maintain consistency across all dimensions." : sb.toString().trim();
    }

    private String buildRecommendations(PreparationLevelEnum level) {
        return switch (level) {
            case BEGINNER -> "Focus on learning the STAR method. Practice 3 sessions per week with behavioral questions.";
            case INTERMEDIATE -> "Work on technical depth. Add case study sessions to your practice routine.";
            case ADVANCED -> "Refine your delivery and confidence. Practice panel and pitch interview formats.";
            case EXPERT -> "Maintain your level. Consider mock interviews with senior professionals for final polish.";
        };
    }

    private List<LiveTimelinePoint> aggregateTimeline(List<Response> responses) {
        List<LiveTimelinePoint> merged = new ArrayList<>();
        double offset = 0.0;
        for (Response response : responses) {
            List<LiveTimelinePoint> points = parseTimeline(response.getStressTimelineJson());
            if (points.isEmpty()) {
                double fallbackT = response.getDurationSeconds() == null ? 0.0 : response.getDurationSeconds();
                points = List.of(new LiveTimelinePoint(
                        fallbackT,
                        response.getStressProxyScore(),
                        response.getConfidenceProxyScore(),
                        response.getHesitationScore(),
                        response.getAvgVolume(),
                        Boolean.TRUE
                ));
            }
            for (LiveTimelinePoint point : points) {
                double localTime = point.t() == null ? 0.0 : point.t();
                merged.add(new LiveTimelinePoint(
                        offset + localTime,
                        point.stress(),
                        point.confidence(),
                        point.hesitation(),
                        point.volume(),
                        point.speaking()
                ));
            }
            if (!points.isEmpty()) {
                LiveTimelinePoint last = points.get(points.size() - 1);
                offset += last.t() == null ? 0.0 : last.t();
            }
        }
        return merged;
    }

    private List<LiveTimelinePoint> parseTimeline(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, TIMELINE_TYPE);
        } catch (Exception ex) {
            log.warn("Could not parse response timeline JSON [reason={}]", ex.getMessage());
            return List.of();
        }
    }

    private String writeTimeline(List<LiveTimelinePoint> timeline) {
        try {
            return objectMapper.writeValueAsString(timeline == null ? List.of() : timeline);
        } catch (Exception ex) {
            log.warn("Could not serialize report timeline JSON [reason={}]", ex.getMessage());
            return "[]";
        }
    }

    private double clamp(double v) { return Math.min(1.0, Math.max(0.0, v)); }
    private double round(double v) { return Math.round(v * 100.0) / 100.0; }

    private record AiNarrative(String strengths, String improvements, String recommendations) {}
}
