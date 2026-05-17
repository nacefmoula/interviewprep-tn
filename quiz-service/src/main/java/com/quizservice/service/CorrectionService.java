package com.quizservice.service;

import com.quizservice.dto.response.QuizResultResponse;
import com.quizservice.enums.AttemptStatus;
import com.quizservice.model.*;
import com.quizservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CorrectionService {

    private final QuizResultRepository quizResultRepository;

    @Value("${quiz.passing-score:60}")
    private double passingScore;

    @Transactional
    public QuizResult correctAttempt(QuizAttempt attempt) {

        List<QuestionResult> questionResults = attempt.getUserAnswers()
                .stream()
                .map(this::correctQuestion)
                .collect(Collectors.toList());

        // Calcul du score total
        int totalPoints = attempt.getQuiz().getQuestions()
                .stream()
                .mapToInt(Question::getPoints)
                .sum();

        int earnedPoints = questionResults.stream()
                .mapToInt(QuestionResult::getEarnedPoints)
                .sum();

        double percentage = totalPoints > 0
                ? (double) earnedPoints / totalPoints * 100
                : 0;

        boolean passed = percentage >= passingScore;

        // Création du résultat
        QuizResult result = QuizResult.builder()
                .attempt(attempt)
                .totalPoints(totalPoints)
                .earnedPoints(earnedPoints)
                .percentage(percentage)
                .passed(passed)
                .questionResults(questionResults)
                .build();

        // Lier les questionResults au result
        questionResults.forEach(qr -> qr.setResult(result));

        // Mettre à jour le statut de la tentative
        attempt.setStatus(AttemptStatus.CORRECTED);

        return quizResultRepository.save(result);
    }

    private QuestionResult correctQuestion(UserAnswer userAnswer) {
        Question question = userAnswer.getQuestion();

        // Les bonnes réponses
        List<Answer> correctAnswers = question.getAnswers()
                .stream()
                .filter(Answer::isCorrect)
                .collect(Collectors.toList());

        // Les réponses du user
        List<Answer> selectedAnswers = userAnswer.getSelectedAnswers();

        // Vérification selon le type
        boolean isCorrect = checkAnswers(question, selectedAnswers, correctAnswers);

        int earnedPoints = isCorrect ? question.getPoints() : 0;

        // Marquer la réponse du user
        userAnswer.setCorrect(isCorrect);

        return QuestionResult.builder()
                .question(question)
                .userAnswers(selectedAnswers)
                .correctAnswers(correctAnswers)
                .explanation(question.getExplanation())
                .isCorrect(isCorrect)
                .earnedPoints(earnedPoints)
                .build();
    }

    private boolean checkAnswers(Question question,
                                 List<Answer> selected,
                                 List<Answer> correct) {
        switch (question.getType()) {
            case SINGLE_CHOICE:
            case TRUE_FALSE:
                // Une seule bonne réponse
                if (selected.size() != 1) return false;
                return correct.contains(selected.get(0));

            case MULTIPLE_CHOICE:
                // Toutes les bonnes réponses doivent être sélectionnées
                // et aucune mauvaise réponse
                return selected.containsAll(correct)
                        && correct.containsAll(selected);

            default:
                return false;
        }
    }
    // Modifie cette méthode dans CorrectionService
    public QuizResultResponse toResultResponse(QuizResult result) {
        return QuizResultResponse.builder()
                .attemptId(result.getAttempt().getId())
                .quizTitle(result.getAttempt().getQuiz().getTitle())
                .earnedPoints(result.getEarnedPoints())
                .totalPoints(result.getTotalPoints())
                .percentage(result.getPercentage())
                .passed(result.isPassed())
                // Utilise le nom de la liste défini dans ton DTO : questionResults
                .questionResults(result.getQuestionResults().stream()
                        .map(this::mapToQuestionResultResponse) // On appelle la nouvelle méthode
                        .collect(Collectors.toList()))
                .build();
    }

    // Assure-toi que le nom correspond à ton DTO interne : QuestionResultResponse
    private QuizResultResponse.QuestionResultResponse mapToQuestionResultResponse(QuestionResult qr) {
        return QuizResultResponse.QuestionResultResponse.builder()
                .questionContent(qr.getQuestion().getContent())
                .questionType(qr.getQuestion().getType().name())
                .isCorrect(qr.isCorrect())
                .earnedPoints(qr.getEarnedPoints())
                .explanation(qr.getExplanation()) // ⭐ C'est ici que l'explication est transmise
                .yourAnswers(qr.getUserAnswers().stream()
                        .map(Answer::getContent)
                        .collect(Collectors.toList()))
                .correctAnswers(qr.getCorrectAnswers().stream()
                        .map(Answer::getContent)
                        .collect(Collectors.toList()))
                .build();
    }
}