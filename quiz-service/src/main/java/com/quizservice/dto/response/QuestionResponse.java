package com.quizservice.dto.response;

import com.quizservice.enums.QuestionType;
import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class QuestionResponse {
    private UUID id;
    private String content;
    private QuestionType type;
    private int points;
    private int orderIndex;
    private String explanation;  // ← ajoute

    private String hint; // visible pendant le quiz
    // ⚠️ explanation NON incluse ici (révélée seulement à la correction !)
    private List<AnswerResponse> answers;
}