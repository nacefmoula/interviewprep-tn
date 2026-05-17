package com.quizservice.dto.request;

import com.quizservice.enums.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Builder
@NoArgsConstructor
@AllArgsConstructor
@Data
public class CreateQuestionRequest {

    @NotBlank(message = "Le contenu de la question est obligatoire")
    private String content;

    @NotNull
    private QuestionType type;

    @Min(1) @Max(100)
    private int points = 1;

    private int orderIndex;

    @NotBlank(message = "L'explication est obligatoire pour la correction")
    private String explanation;

    private String hint;

    private Integer timeLimitSeconds;

    @NotEmpty(message = "Au moins 2 réponses sont requises")
    @Valid
    private List<CreateAnswerRequest> answers;
}