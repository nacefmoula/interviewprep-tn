package com.microservice.trainingservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_xp_tracker", indexes = {
    @Index(name = "idx_user_xp_tracker_user_id", columnList = "user_id"),
    @Index(name = "idx_user_xp_tracker_level", columnList = "current_level DESC"),
    @Index(name = "idx_user_xp_tracker_total_xp", columnList = "total_xp DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserXPTracker {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false, unique = true)
    private String userId;
    
    @Column(name = "total_xp", nullable = false)
    private Integer totalXp;
    
    @Column(name = "current_level", nullable = false)
    private Integer currentLevel;
    
    @Column(name = "xp_to_next_level", nullable = false)
    private Integer xpToNextLevel;
    
    @Column(name = "current_streak", nullable = false)
    private Integer currentStreak;
    
    @Column(name = "longest_streak", nullable = false)
    private Integer longestStreak;
    
    @Column(name = "last_activity_date")
    private java.time.LocalDate lastActivityDate;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    public void addXP(Integer xpEarned) {
        this.totalXp += xpEarned;
        calculateLevel();
    }
    
    private void calculateLevel() {
        // Simple level calculation: every 1000 XP = 1 level
        this.currentLevel = Math.max(1, this.totalXp / 1000 + 1);
        this.xpToNextLevel = (currentLevel * 1000) - this.totalXp;
    }
    
    public void incrementStreak() {
        this.currentStreak++;
        if (this.currentStreak > this.longestStreak) {
            this.longestStreak = this.currentStreak;
        }
    }
    
    public void resetStreak() {
        this.currentStreak = 0;
    }
}
