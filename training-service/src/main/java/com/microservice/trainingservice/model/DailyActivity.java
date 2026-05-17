package com.microservice.trainingservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_activities",
    uniqueConstraints = @UniqueConstraint(name = "uk_daily_activity_unique", columnNames = {"user_id", "activity_date"}),
    indexes = {
        @Index(name = "idx_daily_activities_user_id", columnList = "user_id"),
        @Index(name = "idx_daily_activities_date", columnList = "activity_date DESC"),
        @Index(name = "idx_daily_activities_user_date", columnList = "user_id, activity_date DESC")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyActivity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;
    
    @Column(name = "xp_earned", nullable = false)
    private Integer xpEarned;
    
    @Column(name = "session_completed", nullable = false)
    private Boolean sessionCompleted;
    
    @Column(name = "goals_completed", nullable = false)
    private Integer goalsCompleted;

    @Column(name = "behavioral_count", nullable = false)
    private Integer behavioralCount;

    @Column(name = "library_count", nullable = false)
    private Integer libraryCount;

    @Column(name = "quiz_count", nullable = false)
    private Integer quizCount;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    public boolean hasActivity() {
        return xpEarned > 0 || sessionCompleted || goalsCompleted > 0
            || behavioralCount > 0 || libraryCount > 0 || quizCount > 0;
    }
}
