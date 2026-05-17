package com.quizservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor  // Nécessaire pour Jackson (JSON)
@AllArgsConstructor // C'est lui qui manque pour ton code actuel !
public class CreateAnswerRequest {

    @NotBlank(message = "Le contenu de la réponse est obligatoire")
    private String content;

    private boolean correct;

    private String answerExplanation; // explication spécifique à cette réponse
}