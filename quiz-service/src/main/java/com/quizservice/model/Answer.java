package com.quizservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "answers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // Est-ce la bonne réponse ?
    @Column(nullable = false)
    private boolean isCorrect;

    // ⭐ Explication pourquoi cette réponse est correcte/incorrecte
    @Column(columnDefinition = "TEXT")
    private String answerExplanation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
}