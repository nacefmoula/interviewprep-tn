package com.quizservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "quiz_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "attempt_id")
    private QuizAttempt attempt;

    private int totalPoints;
    private int earnedPoints;
    private double percentage;
    private boolean passed;

    // ⭐ Temps total passé
    private Long timeSpentSeconds;

    // ⭐ Nombre de bonnes réponses
    private int correctAnswersCount;
    private int totalQuestionsCount;

    @OneToMany(mappedBy = "result",
            cascade = CascadeType.ALL)
    private List<QuestionResult> questionResults
            = new ArrayList<>();

    private LocalDateTime correctedAt;

    @PrePersist
    protected void onCreate() {
        correctedAt = LocalDateTime.now();
    }
}