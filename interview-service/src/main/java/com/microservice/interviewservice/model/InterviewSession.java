package com.microservice.interviewservice.model;

import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.InterviewTypeEnum;
import com.microservice.interviewservice.ennum.SessionStatusEnum;
import com.microservice.interviewservice.ennum.InterviewLanguage;
import com.microservice.interviewservice.exception.BusinessException;
import jakarta.persistence.*;
import lombok.*;


import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "interview_sessions",
        indexes = {
                @Index(name = "idx_interview_sessions_user_id",     columnList = "user_id"),
                @Index(name = "idx_interview_sessions_status",      columnList = "status"),
                @Index(name = "idx_interview_sessions_user_created",columnList = "user_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private InterviewTypeEnum type;

    @Enumerated(EnumType.STRING)
    @Column(name = "language", nullable = false, length = 16)
    @Builder.Default
    private InterviewLanguage language = InterviewLanguage.EN;

    @Enumerated(EnumType.STRING)
    @Column(name = "industry", nullable = false)
    private IndustryEnum industry;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_level", nullable = false)
    private CareerLevelEnum targetLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SessionStatusEnum status = SessionStatusEnum.IN_PROGRESS;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "difficulty_level", nullable = false)
    private Integer difficultyLevel;

    @Column(name = "is_recorded", nullable = false)
    @Builder.Default
    private Boolean isRecorded = false;

    @Column(name = "consent_given", nullable = false)
    @Builder.Default
    private Boolean consentGiven = false;

    @Column(name = "recording_url")
    private String recordingUrl;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ─── Lifecycle hook ──────────────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        // Session starts immediately on creation
        this.startedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = SessionStatusEnum.IN_PROGRESS;
        }
    }

    // ─── Business methods ────────────────────────────────────────────────────

    public void pause() {
        if (this.status != SessionStatusEnum.IN_PROGRESS) {
            throw new BusinessException(
                    "Cannot pause session. Current status: " + this.status +
                            ". Only IN_PROGRESS sessions can be paused.");
        }
        this.status = SessionStatusEnum.PAUSED;
    }

    public void resume() {
        if (this.status != SessionStatusEnum.PAUSED) {
            throw new BusinessException(
                    "Cannot resume session. Current status: " + this.status +
                            ". Only PAUSED sessions can be resumed.");
        }
        this.status = SessionStatusEnum.IN_PROGRESS;
    }

    public void end() {
        if (this.status != SessionStatusEnum.IN_PROGRESS
                && this.status != SessionStatusEnum.PAUSED) {
            throw new BusinessException(
                    "Cannot complete session. Current status: " + this.status +
                            ". Only IN_PROGRESS or PAUSED sessions can be completed.");
        }
        this.status  = SessionStatusEnum.COMPLETED;
        this.endedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (this.status == SessionStatusEnum.COMPLETED
                || this.status == SessionStatusEnum.CANCELLED) {
            throw new BusinessException(
                    "Cannot cancel session. Current status: " + this.status +
                            ". COMPLETED and CANCELLED sessions cannot be cancelled.");
        }
        this.endedAt = LocalDateTime.now();
        this.status  = SessionStatusEnum.CANCELLED;
    }

    /**
     * Remaining planned time in minutes.
     * Uses startedAt + durationMinutes (planned duration, not elapsed).
     * Returns 0 if time already exceeded.
     */
    public Long getRemainingTime() {
        if (this.startedAt == null || this.durationMinutes == null) {
            return null;
        }
        LocalDateTime plannedEnd = this.startedAt.plusMinutes(this.durationMinutes);
        long remaining = Duration.between(LocalDateTime.now(), plannedEnd).toMinutes();
        return Math.max(remaining, 0L);
    }

    public void incrementDifficulty() {
        if (this.difficultyLevel == null) {
            this.difficultyLevel = 1;
            return;
        }
        this.difficultyLevel = Math.min(this.difficultyLevel + 1, 10);
    }

    public boolean isEditable() {
        return this.status == SessionStatusEnum.IN_PROGRESS
                || this.status == SessionStatusEnum.PAUSED;
    }

    public boolean isTerminal() {
        return this.status == SessionStatusEnum.COMPLETED
                || this.status == SessionStatusEnum.CANCELLED;
    }
}