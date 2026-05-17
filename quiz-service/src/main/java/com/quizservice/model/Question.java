package com.quizservice.model;

import com.quizservice.enums.QuestionType;
import jakarta.persistence.*;
import lombok.*;
import java.util.*;

@Entity
@Table(name = "questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // Type de question
    @Enumerated(EnumType.STRING)
    private QuestionType type;

    // Points de cette question
    @Builder.Default
    private int points = 1;

    // Ordre dans le quiz
    private int orderIndex;

    // ⭐ Explication de la bonne réponse (correction)
    @Column(columnDefinition = "TEXT")
    private String explanation;

    // ⭐ Indice optionnel pour aider le candidat
    @Column(columnDefinition = "TEXT")
    private String hint;

    // Temps limite par question en secondes (optionnel)
    private Integer timeLimitSeconds;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    // Dans Question.java
    @OneToMany(mappedBy = "question", fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    private List<Answer> answers = new ArrayList<>();
}