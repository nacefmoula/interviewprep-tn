package com.microservice.interviewservice.mapper;

import com.microservice.interviewservice.dto.request.CreateInterviewSessionRequest;
import com.microservice.interviewservice.dto.response.InterviewSessionResponse;
import com.microservice.interviewservice.ennum.InterviewLanguage;
import com.microservice.interviewservice.ennum.SessionStatusEnum;
import com.microservice.interviewservice.model.InterviewSession;
import org.springframework.stereotype.Component;

@Component
public class InterviewSessionMapper {

    public InterviewSession toEntity(CreateInterviewSessionRequest request, String userId) {
        return InterviewSession.builder()
                .userId(userId)
                .type(request.getType())
                .industry(request.getIndustry())
                .targetLevel(request.getTargetLevel())
                .status(SessionStatusEnum.IN_PROGRESS)
                // Default to English if the client didn't supply a language
                .language(request.getLanguage() != null ? request.getLanguage() : InterviewLanguage.EN)
                .durationMinutes(request.getDurationMinutes())
                .difficultyLevel(request.getDifficultyLevel())
                .isRecorded(request.getIsRecorded())
                .consentGiven(request.getConsentGiven())
                .build();
    }

    public InterviewSessionResponse toResponse(InterviewSession session) {
        return InterviewSessionResponse.builder()
                .id(session.getId())
                .userId(session.getUserId())
                .type(session.getType())
                .industry(session.getIndustry())
                .targetLevel(session.getTargetLevel())
                .status(session.getStatus())
                .language(session.getLanguage())
                .durationMinutes(session.getDurationMinutes())
                .difficultyLevel(session.getDifficultyLevel())
                .isRecorded(session.getIsRecorded())
                .consentGiven(session.getConsentGiven())
                .recordingUrl(session.getRecordingUrl())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .createdAt(session.getCreatedAt())
                .remainingTimeMinutes(session.getRemainingTime())
                .build();
    }
}