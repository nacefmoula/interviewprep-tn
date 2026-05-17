package com.microservice.interviewservice.service;

import java.util.List;

import com.microservice.interviewservice.dto.request.CreateInterviewSessionRequest;
import com.microservice.interviewservice.dto.request.UpdateInterviewSessionRequest;
import com.microservice.interviewservice.dto.response.InterviewSessionResponse;
import com.microservice.interviewservice.model.Question;

public interface InterviewSessionService {

    InterviewSessionResponse createSession(CreateInterviewSessionRequest request, String userId);

    InterviewSessionResponse getSession(Long id, String userId);

    List<InterviewSessionResponse> getMySessions(String userId);

    InterviewSessionResponse updateSession(Long id, UpdateInterviewSessionRequest request, String userId);

    InterviewSessionResponse pauseSession(Long id, String userId);

    InterviewSessionResponse resumeSession(Long id, String userId);

    InterviewSessionResponse completeSession(Long id, String userId);

    InterviewSessionResponse cancelSession(Long id, String userId);

    Question getNextQuestion(Long sessionId, String userId);

    // ── User: delete own session ──────────────────────────────────────────────
    void deleteSession(Long id, String userId);

    // ── Admin: operate on any user's sessions ────────────────────────────────
    List<InterviewSessionResponse> getSessionsByUser(String targetUserId);

    void adminDeleteSession(Long id);
}