package com.quizservice.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class QuizResultResponse {

    private UUID attemptId;
    private String quizTitle;
    private String category;

    // Score global
    private int totalPoints;
    private int earnedPoints;
    private double percentage;
    private boolean passed;
    private String passingMessage; // "Félicitations !" ou "Continuez à pratiquer !"

    // Stats
    private int correctAnswersCount;
    private int totalQuestionsCount;
    private String timeSpent; // "12 min 34 sec"
    private int attemptNumber;

    // Classement
    private Integer rank;

    private LocalDateTime submittedAt;

    // ⭐ La correction question par question
    private List<QuestionResultResponse> questionResults;

    @Data
    @Builder
    public static class QuestionResultResponse {
        private int orderIndex;
        private String questionContent;
        private String questionType;
        private int points;
        private boolean isCorrect;
        private int earnedPoints;

        // Ce que le user a choisi
        private List<String> yourAnswers;

        // Les bonnes réponses
        private List<String> correctAnswers;

        // ⭐ L'explication de la correction
        private String explanation;

        // Explication par réponse (si disponible)
        private List<AnswerCorrectionDetail> answerDetails;

        @Data
        @Builder
        public static class AnswerCorrectionDetail {
            private String content;
            private boolean isCorrect;
            private boolean wasSelected;
            private String explanation;
        }
    }
}