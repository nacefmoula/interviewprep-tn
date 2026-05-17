package com.microservice.interviewservice.model;

import java.time.LocalDateTime;

import com.microservice.interviewservice.ennum.PreparationLevelEnum;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "performance_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerformanceReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private InterviewSession session;

    private Double globalScore;
    private Double communicationScore;
    private Double contentQualityScore;
    private Double stressManagementScore;
    private Double confidenceScore;

    @Column(name = "hesitation_score")
    private Double hesitationScore;

    @Column(name = "stress_proxy_score")
    private Double stressProxyScore;

    @Enumerated(EnumType.STRING)
    private PreparationLevelEnum preparationLevel;

    @Column(columnDefinition = "TEXT")
    private String topStrengths;

    @Column(columnDefinition = "TEXT")
    private String areasForImprovement;

    @Column(columnDefinition = "TEXT")
    private String actionableRecommendations;

    @Column(name = "behavioral_summary", columnDefinition = "TEXT")
    private String behavioralSummary;

    @Column(name = "communication_summary", columnDefinition = "TEXT")
    private String communicationSummary;

    @Column(name = "stress_proxy_summary", columnDefinition = "TEXT")
    private String stressProxySummary;

    @Column(name = "stress_timeline_json", columnDefinition = "TEXT")
    private String stressTimelineJson;

    private Integer estimatedSessionsToNextLevel;

    @Column(nullable = false)
    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        if (generatedAt == null) generatedAt = LocalDateTime.now();
    }
}
