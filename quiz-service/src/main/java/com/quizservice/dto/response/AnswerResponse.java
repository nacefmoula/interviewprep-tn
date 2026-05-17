package com.quizservice.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class AnswerResponse {
    private UUID id;
    private String content;
    private Boolean isCorrect;        // ← ajoute
    private String answerExplanation; // ← ajoute
    // ⚠️ isCorrect NON inclus ici (révélé seulement à la correction !)
}