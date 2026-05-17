package com.quizservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "quiz_statistics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    private Quiz quiz;

    private int totalAttempts;
    private double averageScore;
    private double averageTime;
    private int passCount;
    private int failCount;

    // Question la plus ratée
    private UUID hardestQuestionId;

    // Question la mieux réussie
    private UUID easiestQuestionId;

    private LocalDateTime updatedAt;
}