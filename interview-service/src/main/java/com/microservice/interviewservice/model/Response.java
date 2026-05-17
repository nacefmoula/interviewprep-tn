package com.microservice.interviewservice.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "responses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Response {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(columnDefinition = "TEXT")
    private String transcription;

    private String audioFileUrl;
    private String videoFileUrl;
    private Integer durationSeconds;
    private Integer wordCount;

    private Double overallScore;

    @Column(name = "ai_feedback", columnDefinition = "TEXT")
    private String aiFeedback;

    @Column(name = "turn_index")
    private Integer turnIndex;

    @Column(name = "communication_score")
    private Double communicationScore;

    @Column(name = "hesitation_score")
    private Double hesitationScore;

    @Column(name = "stress_proxy_score")
    private Double stressProxyScore;

    @Column(name = "confidence_proxy_score")
    private Double confidenceProxyScore;

    @Column(name = "avg_volume")
    private Double avgVolume;

    @Column(name = "max_volume")
    private Double maxVolume;

    @Column(name = "silence_ratio")
    private Double silenceRatio;

    @Column(name = "blink_rate")
    private Double blinkRate;

    @Column(name = "gaze_stability_score")
    private Double gazeStabilityScore;

    @Column(name = "head_motion_score")
    private Double headMotionScore;

    @Column(name = "brow_tension_score")
    private Double browTensionScore;

    @Column(name = "mouth_tension_score")
    private Double mouthTensionScore;

    @Column(name = "reaction_type", length = 40)
    private String reactionType;

    @Column(name = "agent_message", columnDefinition = "TEXT")
    private String agentMessage;

    @Column(name = "encouragement", columnDefinition = "TEXT")
    private String encouragement;

    @Column(name = "stress_timeline_json", columnDefinition = "TEXT")
    private String stressTimelineJson;

    @Column(nullable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) recordedAt = LocalDateTime.now();
    }

    public Double getWordsPerMinute() {
        if (wordCount == null || durationSeconds == null || durationSeconds == 0) return null;
        return wordCount / (durationSeconds / 60.0);
    }

    public boolean isComplete() {
        return overallScore != null && transcription != null && !transcription.isBlank();
    }
}
