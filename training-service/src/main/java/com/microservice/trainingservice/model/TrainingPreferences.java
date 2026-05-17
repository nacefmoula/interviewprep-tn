package com.microservice.trainingservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "training_preferences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingPreferences {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Column(name = "goal", length = 50)
    private String goal;

    @Column(name = "target_role", length = 120)
    private String targetRole;

    @Column(name = "seniority", length = 50)
    private String seniority;

    @Column(name = "minutes_per_day")
    private Integer minutesPerDay;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
