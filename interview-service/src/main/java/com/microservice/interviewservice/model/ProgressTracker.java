package com.microservice.interviewservice.model;

import java.time.LocalDateTime;

import com.microservice.interviewservice.ennum.PreparationLevelEnum;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "progress_tracker")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProgressTracker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String userId;

    @Column(nullable = false)
    private Integer totalSessionsCompleted;

    @Column(nullable = false)
    private Double averageScore;

    @Column(nullable = false)
    private Double bestScore;

    @Enumerated(EnumType.STRING)
    private PreparationLevelEnum currentLevel;

    private LocalDateTime lastSessionAt;

    @PrePersist
    protected void onCreate() {
        if (totalSessionsCompleted == null) totalSessionsCompleted = 0;
        if (averageScore == null)           averageScore = 0.0;
        if (bestScore == null)              bestScore = 0.0;
    }

    // ── Core update logic ─────────────────────────────────────────────────

    public void updateFromReport(PerformanceReport report) {
        double newScore = report.getGlobalScore() != null ? report.getGlobalScore() : 0.0;

        // Recalculate rolling average
        double total = this.averageScore * this.totalSessionsCompleted + newScore;
        this.totalSessionsCompleted++;
        this.averageScore = round(total / this.totalSessionsCompleted);

        // Update best score
        if (newScore > this.bestScore) {
            this.bestScore = round(newScore);
        }

        // Update level and timestamp
        this.currentLevel  = report.getPreparationLevel();
        this.lastSessionAt = LocalDateTime.now();
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}