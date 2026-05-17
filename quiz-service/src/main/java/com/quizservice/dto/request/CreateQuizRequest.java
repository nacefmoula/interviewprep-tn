package com.quizservice.dto.request;

import com.quizservice.enums.QuizDifficulty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class CreateQuizRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 3, max = 100)
    private String title;

    private String description;

    private Long moduleId; // <--- CHANGE CECI (était UUID)
    @NotBlank(message = "La catégorie est obligatoire")
    private String category;

    private QuizDifficulty difficulty = QuizDifficulty.MEDIUM;

    @Min(value = 1, message = "Le temps minimum est 1 minute")
    @Max(value = 180, message = "Le temps maximum est 180 minutes")
    private Integer timeLimit;

    @Min(1) @Max(10)
    private Integer maxAttempts;

    @DecimalMin("0.0") @DecimalMax("100.0")
    private double passingScore = 60.0;

    private boolean shuffleQuestions = false;
    private boolean shuffleAnswers = false;
    private boolean showCorrectionImmediately = true;

    @Valid
    private List<CreateQuestionRequest> questions;
}