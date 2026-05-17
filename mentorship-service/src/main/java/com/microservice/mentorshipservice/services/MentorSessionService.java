package com.microservice.mentorshipservice.services;

import com.microservice.mentorshipservice.entities.MentorRequest;
import com.microservice.mentorshipservice.entities.MentorSession;
import com.microservice.mentorshipservice.enums.MentorStatus;
import com.microservice.mentorshipservice.enums.SessionStatus;
import com.microservice.mentorshipservice.repository.MentorRequestRepository;
import com.microservice.mentorshipservice.repository.MentorRatingRepository;
import com.microservice.mentorshipservice.repository.MentorSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class MentorSessionService {

    private static final Logger log = LoggerFactory.getLogger(MentorSessionService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Autowired
    private MentorSessionRepository sessionRepository;

    @Autowired
    private MentorRequestRepository requestRepository;

    @Autowired
    private MentorRatingRepository ratingRepository;

    @Autowired
    private SessionEmailNotificationService sessionEmailNotificationService;

    // CREATE SESSION (when request is accepted)
    public MentorSession createSession(UUID requestId, LocalDateTime scheduledAt, String meetingLink) {
        MentorRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (request.getStatus() != MentorStatus.ACCEPTED) {
            throw new RuntimeException("Cannot create session for non-accepted request");
        }
        // REMOVE the "session already exists" check — mentor should be able to reschedule
        // Only block if there's already a SCHEDULED (active) session
        boolean hasActiveSession = sessionRepository.findByRequestId(requestId)
                .stream()
                .anyMatch(s -> s.getStatus() == SessionStatus.SCHEDULED);
        if (hasActiveSession) {
            throw new RuntimeException("An active session already exists. Cancel it before scheduling a new one.");
        }

        MentorSession session = new MentorSession();
        session.setRequestId(requestId);
        session.setScheduledAt(scheduledAt);
        session.setMeetingLink(normalizeOrGenerateRoomName(meetingLink));
        session.setStatus(SessionStatus.SCHEDULED);

        MentorSession saved = sessionRepository.save(session);

        // Send reminder emails immediately (easy mode: uses forwarded Authorization header)
        try {
            sessionEmailNotificationService.notifySessionScheduled(request, saved.getScheduledAt());
        } catch (Exception ex) {
            log.warn("Failed sending schedule reminder emails (sessionId={})", saved.getId(), ex);
        }

        return saved;
    }

    private String normalizeOrGenerateRoomName(String meetingLink) {
        if (meetingLink != null) {
            String trimmed = meetingLink.trim();
            if (!trimmed.isEmpty()) {
                return trimmed;
            }
        }

        byte[] bytes = new byte[16];
        SECURE_RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return "mentorship-" + token;
    }

    // GET SESSIONS BY REQUEST
    public List<MentorSession> getSessionsByRequest(UUID requestId) {
        return sessionRepository.findByRequestId(requestId);
    }

    public List<MentorSession> getAllSessions() {
        return sessionRepository.findAll();
    }

    // UPDATE SESSION STATUS
    public MentorSession completeSession(UUID sessionId) {
        MentorSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        session.setStatus(com.microservice.mentorshipservice.enums.SessionStatus.COMPLETED);
        return sessionRepository.save(session);
    }

    public MentorSession cancelSession(UUID sessionId) {
        MentorSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == SessionStatus.CANCELLED) {
            return session;
        }

        session.setStatus(com.microservice.mentorshipservice.enums.SessionStatus.CANCELLED);
        MentorSession saved = sessionRepository.save(session);

        try {
            MentorRequest request = requestRepository.findById(saved.getRequestId()).orElse(null);
            sessionEmailNotificationService.notifySessionCancelled(request, saved.getScheduledAt());
        } catch (Exception ex) {
            log.warn("Failed sending cancellation emails (sessionId={})", saved.getId(), ex);
        }

        return saved;
    }

    @Transactional
    public void deleteSession(UUID sessionId) {
        if (!sessionRepository.existsById(sessionId)) {
            throw new RuntimeException("Session not found");
        }
        ratingRepository.deleteBySessionId(sessionId);
        sessionRepository.deleteById(sessionId);
    }

    public MentorSession updateSession(UUID sessionId, LocalDateTime scheduledAt, String meetingLink) {
        MentorSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() != SessionStatus.SCHEDULED) {
            throw new RuntimeException("Only SCHEDULED sessions can be edited");
        }

        if (scheduledAt != null) {
            session.setScheduledAt(scheduledAt);
        }
        if (meetingLink != null) {
            session.setMeetingLink(normalizeOrGenerateRoomName(meetingLink));
        }
        return sessionRepository.save(session);
    }
}