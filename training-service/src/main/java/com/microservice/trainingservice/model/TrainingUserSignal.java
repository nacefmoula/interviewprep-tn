package com.microservice.trainingservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "training_user_signals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingUserSignal {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Column(name = "last_session_id")
    private Long lastSessionId;

    @Column(name = "session_type", length = 80)
    private String sessionType;

    @Column(name = "global_score")
    private Double globalScore;

    @Column(name = "preparation_level", length = 80)
    private String preparationLevel;

    @Column(name = "total_sessions_completed")
    private Integer totalSessionsCompleted;

    @Column(name = "event_generated_at", length = 80)
    private String eventGeneratedAt;

    // ── User profile snapshot (populated by Kafka user.* events) ─────────────
    // Cached here so path generation does not need to call user-service at runtime.

    @Column(name = "preferred_language", length = 10)
    private String preferredLanguage;

    @Column(name = "preferred_industry", length = 60)
    private String preferredIndustry;

    @Column(name = "user_plan", length = 20)
    private String userPlan;

    /** Comma-separated skills list mirrored from user-service skillsJson. */
    @Column(name = "skills_snapshot", length = 1000)
    private String skillsSnapshot;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
