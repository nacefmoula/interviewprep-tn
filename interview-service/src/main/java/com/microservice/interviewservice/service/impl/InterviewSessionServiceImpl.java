package com.microservice.interviewservice.service.impl;

import java.util.List;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.microservice.interviewservice.dto.request.CreateInterviewSessionRequest;
import com.microservice.interviewservice.dto.request.UpdateInterviewSessionRequest;
import com.microservice.interviewservice.dto.response.InterviewSessionResponse;
import com.microservice.interviewservice.ennum.SessionStatusEnum;
import com.microservice.interviewservice.event.SessionCompletedEvent;
import com.microservice.interviewservice.exception.BusinessException;
import com.microservice.interviewservice.exception.ResourceNotFoundException;
import com.microservice.interviewservice.mapper.InterviewSessionMapper;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.PerformanceReport;
import com.microservice.interviewservice.model.ProgressTracker;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.repository.InterviewSessionRepository;
import com.microservice.interviewservice.repository.PerformanceReportRepository;
import com.microservice.interviewservice.repository.ResponseRepository;
import com.microservice.interviewservice.service.AiQuestionService;
import com.microservice.interviewservice.service.InterviewSessionService;
import com.microservice.interviewservice.service.ProgressTrackerService;
import com.microservice.interviewservice.service.ReportGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class InterviewSessionServiceImpl implements InterviewSessionService {

    private final InterviewSessionRepository  repository;
    private final InterviewSessionMapper      mapper;
    private final AiQuestionService           aiQuestionService;
    private final ResponseRepository          responseRepository;
    private final ReportGenerationService     reportGenerationService;
    private final ProgressTrackerService      progressTrackerService;
    private final PerformanceReportRepository reportRepository;
    private final KafkaTemplate<String, SessionCompletedEvent> kafkaTemplate;

    // ── Create ────────────────────────────────────────────────────────────────

    @Override
    public InterviewSessionResponse createSession(CreateInterviewSessionRequest request, String userId) {
        validateConsent(request.getIsRecorded(), request.getConsentGiven());
        InterviewSession saved = repository.save(mapper.toEntity(request, userId));
        log.info("Session created [id={}, userId={}, type={}]", saved.getId(), userId, saved.getType());
        return mapper.toResponse(saved);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public InterviewSessionResponse getSession(Long id, String userId) {
        return mapper.toResponse(findOwned(id, userId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewSessionResponse> getMySessions(String userId) {
        return repository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(mapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewSessionResponse> getSessionsByUser(String targetUserId) {
        return repository.findAllByUserIdOrderByCreatedAtDesc(targetUserId)
                .stream().map(mapper::toResponse).toList();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @Override
    public InterviewSessionResponse updateSession(Long id, UpdateInterviewSessionRequest request, String userId) {
        InterviewSession session = findOwned(id, userId);
        if (session.isTerminal()) {
            throw new BusinessException("Session [id=" + id + "] is read-only. Status: " + session.getStatus());
        }
        if (request.getType()            != null) session.setType(request.getType());
        if (request.getIndustry()        != null) session.setIndustry(request.getIndustry());
        if (request.getTargetLevel()     != null) session.setTargetLevel(request.getTargetLevel());
        if (request.getDurationMinutes() != null) session.setDurationMinutes(request.getDurationMinutes());
        if (request.getDifficultyLevel() != null) session.setDifficultyLevel(request.getDifficultyLevel());

        Boolean newIsRecorded   = request.getIsRecorded()   != null ? request.getIsRecorded()   : session.getIsRecorded();
        Boolean newConsentGiven = request.getConsentGiven() != null ? request.getConsentGiven() : session.getConsentGiven();
        validateConsent(newIsRecorded, newConsentGiven);
        session.setIsRecorded(newIsRecorded);
        session.setConsentGiven(newConsentGiven);

        log.info("Session updated [id={}, userId={}]", id, userId);
        return mapper.toResponse(repository.save(session));
    }

    // ── Status transitions ────────────────────────────────────────────────────

    @Override
    public InterviewSessionResponse pauseSession(Long id, String userId) {
        InterviewSession session = findOwned(id, userId);
        session.pause();
        return mapper.toResponse(repository.save(session));
    }

    @Override
    public InterviewSessionResponse resumeSession(Long id, String userId) {
        InterviewSession session = findOwned(id, userId);
        session.resume();
        return mapper.toResponse(repository.save(session));
    }

    @Override
    public InterviewSessionResponse completeSession(Long id, String userId) {
        InterviewSession session = findOwned(id, userId);
        session.end();
        InterviewSession saved = repository.save(session);
        log.info("Session completed [id={}, endedAt={}]", id, saved.getEndedAt());

        PerformanceReport report  = reportGenerationService.generateForSession(saved.getId());
        ProgressTracker   tracker = progressTrackerService.updateProgress(userId, report);

        publishEventSafely(SessionCompletedEvent.builder()
                .sessionId(saved.getId())
                .userId(userId)
                .sessionType(saved.getType())
                .globalScore(report.getGlobalScore())
                .preparationLevel(report.getPreparationLevel())
                .totalSessionsCompleted(tracker.getTotalSessionsCompleted())
                .generatedAt(report.getGeneratedAt() != null ? report.getGeneratedAt().toString() : null)
                .build());

        return mapper.toResponse(saved);
    }

    @Override
    public InterviewSessionResponse cancelSession(Long id, String userId) {
        InterviewSession session = findOwned(id, userId);
        session.cancel();
        return mapper.toResponse(repository.save(session));
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Override
    public void deleteSession(Long id, String userId) {
        InterviewSession session = findOwned(id, userId);
        reportRepository.findBySessionId(id).ifPresent(reportRepository::delete);
        responseRepository.deleteBySessionId(id);
        repository.delete(session);
        log.info("Session deleted by owner [id={}, userId={}]", id, userId);
    }

    @Override
    public void adminDeleteSession(Long id) {
        InterviewSession session = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview session not found [id=" + id + "]"));
        reportRepository.findBySessionId(id).ifPresent(reportRepository::delete);
        responseRepository.deleteBySessionId(id);
        repository.delete(session);
        log.info("Session deleted by admin [id={}]", id);
    }

    // ── Next question — NO @Transactional ────────────────────────────────────
    //
    // This method must NOT be @Transactional.
    // Reason: aiQuestionService.generateQuestion() calls Groq (1-5 seconds) and
    // then saves the question in its own REQUIRES_NEW transaction via
    // QuestionPersistenceService. If this method held a transaction open,
    // any save failure in a previous retry would mark that outer transaction
    // as "aborted", causing all subsequent retries to fail with
    // "current transaction is aborted, commands ignored until end of transaction block"
    // even if the AI call itself succeeded.

    @Override
    // ⚠️ NO @Transactional — intentional, see comment above
    public Question getNextQuestion(Long sessionId, String userId) {
        // Load the session in a short read-only transaction
        InterviewSession session = loadSessionReadOnly(sessionId, userId);

        if (session.getStatus() != SessionStatusEnum.IN_PROGRESS) {
            throw new BusinessException(
                    "Session is not active. Current status: " + session.getStatus());
        }

        List<Long> askedIds = loadAskedIds(sessionId);
        return aiQuestionService.generateQuestion(session, askedIds);
    }

    // ─── Private read helpers (each opens+closes its own short transaction) ───

    @Transactional(readOnly = true)
    protected InterviewSession loadSessionReadOnly(Long sessionId, String userId) {
        return findOwned(sessionId, userId);
    }

    @Transactional(readOnly = true)
    protected List<Long> loadAskedIds(Long sessionId) {
        return responseRepository.findQuestionIdsBySessionId(sessionId);
    }

    // ── Kafka helper ──────────────────────────────────────────────────────────

    private void publishEventSafely(SessionCompletedEvent event) {
        try {
            kafkaTemplate.send("interview.session.completed", event.getUserId(), event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Kafka delivery failed [sessionId={}]: {}",
                                    event.getSessionId(), ex.getMessage());
                        } else {
                            log.info("SessionCompletedEvent published [sessionId={}]",
                                    event.getSessionId());
                        }
                    });
        } catch (Exception ex) {
            log.warn("Could not submit Kafka send [sessionId={}]: {}",
                    event.getSessionId(), ex.getMessage());
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private InterviewSession findOwned(Long id, String userId) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview session not found [id=" + id + "] for the current user."));
    }

    private void validateConsent(Boolean isRecorded, Boolean consentGiven) {
        if (Boolean.TRUE.equals(isRecorded) && !Boolean.TRUE.equals(consentGiven)) {
            throw new BusinessException(
                    "Recording requires explicit consent. Set consentGiven=true when isRecorded=true.");
        }
    }
}