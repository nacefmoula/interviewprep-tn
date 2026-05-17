package com.quizservice.model;


import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "oral_attempt_results")
public class OralAttemptResult {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String attemptId;        // FK vers quiz_attempts

    @Column(nullable = false)
    private String questionId;

    @Column(columnDefinition = "TEXT")
    private String transcription;    // ce que l'utilisateur a dit

    @Column(nullable = false)
    private Integer score;           // 0-100

    @Column(columnDefinition = "TEXT")
    private String feedback;         // explication de l'IA

    @Column(nullable = false)
    private Boolean isCorrect;

    private Instant createdAt = Instant.now();
}