package com.quizservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.*;

@Entity
@Table(name = "question_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "result_id")
    private QuizResult result;

    @ManyToOne
    @JoinColumn(name = "question_id")
    private Question question;

    // Ce que le user a choisi
    @ManyToMany
    @JoinTable(
            name = "qr_user_answers",
            joinColumns = @JoinColumn(name = "qr_id"),
            inverseJoinColumns = @JoinColumn(name = "answer_id")
    )
    private List<Answer> userAnswers = new ArrayList<>();

    // Les vraies bonnes réponses
    @ManyToMany
    @JoinTable(
            name = "qr_correct_answers",
            joinColumns = @JoinColumn(name = "qr_id"),
            inverseJoinColumns = @JoinColumn(name = "answer_id")
    )
    private List<Answer> correctAnswers = new ArrayList<>();

    // ⭐ Explication de la correction
    private String explanation;

    private boolean isCorrect;
    private int earnedPoints;
}