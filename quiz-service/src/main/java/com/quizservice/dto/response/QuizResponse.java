package com.quizservice.dto.response;

import com.quizservice.enums.QuizDifficulty;
import com.quizservice.enums.QuizStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class QuizResponse {
    private UUID id;
    private String title;
    private String description;
    private Long moduleId;
    private String category;
    private QuizDifficulty difficulty;
    private Integer timeLimit;
    private Integer maxAttempts;
    private double passingScore;
    private QuizStatus status;
    private boolean shuffleQuestions;
    private boolean shuffleAnswers;
    private boolean showCorrectionImmediately;
    private UUID createdBy;
    private int totalQuestions;
    private int totalPoints;
    private LocalDateTime createdAt;

    // Inclus seulement pour ADMIN (pas les isCorrect pour les users)
    private List<QuestionResponse> questions;
}