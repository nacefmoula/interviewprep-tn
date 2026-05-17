package com.quizservice.model;

import com.quizservice.enums.AttemptStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "quiz_attempts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ID du user connecté (vient du token JWT)
    @Column(nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    // Numéro de tentative (1ère, 2ème, 3ème...)
    private int attemptNumber;

    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;

    // ⭐ Temps passé en secondes
    private Long timeSpentSeconds;

    @OneToMany(mappedBy = "attempt",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
    private List<UserAnswer> userAnswers = new ArrayList<>();

    @OneToOne(mappedBy = "attempt",
            cascade = CascadeType.ALL)
    private QuizResult result;

    @PrePersist
    protected void onCreate() {
        startedAt = LocalDateTime.now();
    }
}