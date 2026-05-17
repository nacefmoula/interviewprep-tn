package com.microservice.interviewservice.model;

import java.time.LocalDateTime;

import com.microservice.interviewservice.ennum.LiveAgentMode;
import com.microservice.interviewservice.ennum.LiveInterviewPhase;
import com.microservice.interviewservice.ennum.LiveSessionStatus;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "live_interview_sessions",
    indexes = {
        @Index(name = "idx_live_interview_session_session_id", columnList = "interview_session_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveInterviewSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_session_id", nullable = false, unique = true)
    private InterviewSession interviewSession;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LiveSessionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase", nullable = false)
    private LiveInterviewPhase phase;

    @Enumerated(EnumType.STRING)
    @Column(name = "agent_mode")
    private LiveAgentMode agentMode;

    @Column(name = "current_question_id")
    private Long currentQuestionId;

    @Column(name = "answered_count", nullable = false)
    private Integer answeredCount;

    @Column(name = "max_questions", nullable = false)
    private Integer maxQuestions;

    @Column(name = "candidate_profile_json", columnDefinition = "TEXT")
    private String candidateProfileJson;

    @Column(name = "conversation_history_json", columnDefinition = "TEXT")
    private String conversationHistoryJson;

    @Column(name = "self_intro_transcript", columnDefinition = "TEXT")
    private String selfIntroTranscript;

    @Column(name = "last_agent_message", columnDefinition = "TEXT")
    private String lastAgentMessage;

    @Column(name = "stress_timeline_json", columnDefinition = "TEXT")
    private String stressTimelineJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = LiveSessionStatus.ACTIVE;
        if (phase == null) phase = LiveInterviewPhase.PRE_INTERVIEW;
        if (agentMode == null) agentMode = LiveAgentMode.INTRO;
        if (answeredCount == null) answeredCount = 0;
        if (maxQuestions == null) maxQuestions = 6;
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
