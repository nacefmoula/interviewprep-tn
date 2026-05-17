package com.microservice.trainingservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_badges", 
    uniqueConstraints = @UniqueConstraint(name = "uk_user_badge_unique", columnNames = {"user_id", "badge_id"}),
    indexes = {
        @Index(name = "idx_user_badges_user_id", columnList = "user_id"),
        @Index(name = "idx_user_badges_badge_id", columnList = "badge_id"),
        @Index(name = "idx_user_badges_earned_date", columnList = "earned_date DESC")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "badge_id", nullable = false)
    private Badge badge;
    
    @CreationTimestamp
    @Column(name = "earned_date", nullable = false, updatable = false)
    private LocalDateTime earnedDate;
    
    @Column(name = "progress")
    private Integer progress; // For badges that have multiple steps (nullable)
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    public boolean isInProgress() {
        return progress != null && progress < 100;
    }
}
