package com.quizservice.dto.request;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.UUID;
@Builder
@Data
@NoArgsConstructor // OBLIGATOIRE pour Jackson
@AllArgsConstructor
public class SubmitAttemptRequest {
    @NotNull
    private List<UserAnswerRequest> answers;
    // Temps passé en secondes (calculé côté Angular)
    private Long timeSpentSeconds;
    @Data
    public static class UserAnswerRequest {
        @NotNull
        private UUID questionId;
        // IDs des réponses sélectionnées
        private List<UUID> selectedAnswerIds;
        private String transcription;
        private Integer score;         // نزيدو هذا (للشفوي)
        private String feedback;
    }
}