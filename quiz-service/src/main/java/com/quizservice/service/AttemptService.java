package com.quizservice.service;

import com.quizservice.dto.response.QuizResultResponse;
import com.quizservice.enums.AttemptStatus;
import com.quizservice.exception.*;
import com.quizservice.model.*;
import com.quizservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AttemptService {

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final CorrectionService correctionService;
    private final QuizAttemptRepository QuizAttemptRepository;

    // ── Démarrer un quiz ──────────────────────────────────────────────────────

    public Map<String, Object> startQuiz(UUID quizId, UUID userId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new QuizNotFoundException("Quiz non trouvé"));

        if (quiz.getStatus() != com.quizservice.enums.QuizStatus.PUBLISHED) {
            throw new IllegalStateException("Ce quiz n'est pas disponible");
        }

        Optional<QuizAttempt> inProgress = attemptRepository
                .findByUserIdAndQuizIdAndStatus(userId, quizId, AttemptStatus.IN_PROGRESS);
        if (inProgress.isPresent()) {
            throw new IllegalStateException("Vous avez déjà une tentative en cours pour ce quiz");
        }

        if (quiz.getMaxAttempts() != null) {
            long count = attemptRepository.countByUserIdAndQuizId(userId, quizId);
            if (count >= quiz.getMaxAttempts()) {
                throw new IllegalStateException("Limite de tentatives atteinte (" + quiz.getMaxAttempts() + ")");
            }
        }

        long attemptNumber = attemptRepository.countByUserIdAndQuizId(userId, quizId) + 1;
        QuizAttempt attempt = QuizAttempt.builder()
                .userId(userId)
                .quiz(quiz)
                .status(AttemptStatus.IN_PROGRESS)
                .attemptNumber((int) attemptNumber)
                .build();

        attempt = attemptRepository.save(attempt);

        List<Question> questions = new ArrayList<>(quiz.getQuestions());
        if (quiz.isShuffleQuestions()) Collections.shuffle(questions);

        List<Map<String, Object>> mappedQuestions = questions.stream().map(q -> {
            Map<String, Object> qMap = new HashMap<>();
            qMap.put("id", q.getId());
            qMap.put("content", q.getContent());
            qMap.put("type", q.getType());
            qMap.put("points", q.getPoints());

            List<Map<String, Object>> mappedAnswers = q.getAnswers().stream().map(a -> {
                Map<String, Object> aMap = new HashMap<>();
                aMap.put("id", a.getId());
                aMap.put("content", a.getContent());
                return aMap;
            }).collect(Collectors.toList());

            qMap.put("answers", mappedAnswers);
            return qMap;
        }).collect(Collectors.toList());

        return Map.of(
                "attemptId", attempt.getId(),
                "quizTitle", quiz.getTitle(),
                "timeLimit", quiz.getTimeLimit() != null ? quiz.getTimeLimit() : 0,
                "totalQuestions", mappedQuestions.size(),
                "questions", mappedQuestions
        );
    }

    // ── Soumettre les réponses ────────────────────────────────────────────────

    public QuizResultResponse submitAttempt(UUID attemptId, com.quizservice.dto.request.SubmitAttemptRequest request, UUID userId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new AttemptNotFoundException("Tentative non trouvée"));

        if (!attempt.getUserId().equals(userId)) {
            throw new AccessDeniedException("Cette tentative ne vous appartient pas");
        }
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new QuizAlreadySubmittedException("Cette tentative a déjà été soumise");
        }

        List<UserAnswer> userAnswers = request.getAnswers().stream()
                .map(answerReq -> {
                    Question question = questionRepository.findById(answerReq.getQuestionId())
                            .orElseThrow(() -> new QuizNotFoundException("Question non trouvée"));
                    List<Answer> selected = answerReq.getSelectedAnswerIds() == null
                            ? new ArrayList<>()
                            : answerReq.getSelectedAnswerIds().stream()
                            .map(id -> answerRepository.findById(id).orElseThrow())
                            .collect(Collectors.toList());
                    return UserAnswer.builder()
                            .attempt(attempt)
                            .question(question)
                            .selectedAnswers(selected)
                            .build();
                })
                .collect(Collectors.toList());

        attempt.getUserAnswers().clear();
        attempt.getUserAnswers().addAll(userAnswers);
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setTimeSpentSeconds(request.getTimeSpentSeconds());

        QuizResult result = correctionService.correctAttempt(attempt);
        return correctionService.toResultResponse(result);
    }

    // ── Historique — CORRIGÉ : retourne les vraies données ───────────────────
  /*  @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyAttempts(UUID userId) {
        List<QuizAttempt> attempts = QuizAttemptRepository.findByUserIdOrderByStartedAtDesc(userId);

        return attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.CORRECTED) // only finished
                .map(attempt -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", attempt.getId());
                    map.put("attemptId", attempt.getId());
                    map.put("status", attempt.getStatus());
                    map.put("startedAt", attempt.getStartedAt());
                    map.put("submittedAt", attempt.getSubmittedAt());
                    map.put("attemptNumber", attempt.getAttemptNumber());

                    if (attempt.getQuiz() != null) {
                        map.put("quizTitle", attempt.getQuiz().getTitle());
                        map.put("category", attempt.getQuiz().getCategory());
                        map.put("difficulty", attempt.getQuiz().getDifficulty());
                        // FIX : vrai nombre de questions
                        map.put("totalQuestionsCount",
                                attempt.getQuiz().getQuestions() != null
                                        ? attempt.getQuiz().getQuestions().size() : 0);
                    } else {
                        map.put("quizTitle", "Quiz inconnu");
                        map.put("totalQuestionsCount", 0);
                    }

                    if (attempt.getResult() != null) {
                        map.put("percentage", attempt.getResult().getPercentage());
                        map.put("passed", attempt.getResult().isPassed());
                        map.put("earnedPoints", attempt.getResult().getEarnedPoints());
                        map.put("totalPoints", attempt.getResult().getTotalPoints());
                        map.put("correctAnswersCount", attempt.getResult().getCorrectAnswersCount());

                        // FIX PRINCIPAL : inclure la correction complète question/réponse
                        List<Map<String, Object>> questionResults =
                                attempt.getResult().getQuestionResults().stream()
                                        .map(qr -> {
                                            Map<String, Object> qrMap = new HashMap<>();
                                            qrMap.put("questionId", qr.getQuestion().getId());
                                            qrMap.put("questionContent", qr.getQuestion().getContent());
                                            qrMap.put("questionType", qr.getQuestion().getType().name());
                                            qrMap.put("isCorrect", qr.isCorrect());
                                            qrMap.put("earnedPoints", qr.getEarnedPoints());
                                            qrMap.put("explanation", qr.getExplanation());

                                            // Réponses de l'utilisateur
                                            qrMap.put("yourAnswers", qr.getUserAnswers().stream()
                                                    .map(Answer::getContent)
                                                    .collect(Collectors.toList()));
                                            // IDs des réponses sélectionnées (pour matching Angular)
                                            qrMap.put("yourAnswerIds", qr.getUserAnswers().stream()
                                                    .map(a -> a.getId().toString())
                                                    .collect(Collectors.toList()));

                                            // Bonnes réponses
                                            qrMap.put("correctAnswers", qr.getCorrectAnswers().stream()
                                                    .map(Answer::getContent)
                                                    .collect(Collectors.toList()));
                                            qrMap.put("correctAnswerIds", qr.getCorrectAnswers().stream()
                                                    .map(a -> a.getId().toString())
                                                    .collect(Collectors.toList()));

                                            // Toutes les réponses possibles avec leur statut
                                            List<UUID> userSelectedIds = qr.getUserAnswers().stream()
                                                    .map(Answer::getId).collect(Collectors.toList());
                                            List<UUID> correctIds = qr.getCorrectAnswers().stream()
                                                    .map(Answer::getId).collect(Collectors.toList());

                                            List<Map<String, Object>> answerDetails =
                                                    qr.getQuestion().getAnswers().stream()
                                                            .map(a -> {
                                                                Map<String, Object> ad = new HashMap<>();
                                                                ad.put("id", a.getId().toString());
                                                                ad.put("content", a.getContent());
                                                                ad.put("isCorrect", a.isCorrect());
                                                                ad.put("wasSelected", userSelectedIds.contains(a.getId()));
                                                                ad.put("explanation", a.getAnswerExplanation());
                                                                return ad;
                                                            })
                                                            .collect(Collectors.toList());
                                            qrMap.put("answerDetails", answerDetails);

                                            return qrMap;
                                        })
                                        .collect(Collectors.toList());

                        map.put("questionResults", questionResults);
                    } else {
                        map.put("percentage", 0.0);
                        map.put("passed", false);
                        map.put("questionResults", List.of());
                    }

                    return map;
                })
                .collect(Collectors.toList());
    }*/
    // ── Historique — CORRIGÉ : retourne les vraies données avec moduleId dynamique ───────────────────
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyAttempts(UUID userId) {
        List<QuizAttempt> attempts = QuizAttemptRepository.findByUserIdOrderByStartedAtDesc(userId);

        return attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.CORRECTED) // Uniquement les terminés
                .map(attempt -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", attempt.getId());
                    map.put("attemptId", attempt.getId());
                    map.put("status", attempt.getStatus());
                    map.put("startedAt", attempt.getStartedAt());
                    map.put("submittedAt", attempt.getSubmittedAt());
                    map.put("attemptNumber", attempt.getAttemptNumber());

                    if (attempt.getQuiz() != null) {
                        map.put("quizTitle", attempt.getQuiz().getTitle());
                        map.put("category", attempt.getQuiz().getCategory());
                        map.put("difficulty", attempt.getQuiz().getDifficulty());

                        // ✅ RÉSOLUTION DU PROB : Ajout du moduleId dynamique
                        map.put("moduleId", attempt.getQuiz().getModuleId());

                        // FIX : vrai nombre de questions
                        map.put("totalQuestionsCount",
                                attempt.getQuiz().getQuestions() != null
                                        ? attempt.getQuiz().getQuestions().size() : 0);
                    } else {
                        map.put("quizTitle", "Quiz inconnu");
                        map.put("moduleId", null);
                        map.put("totalQuestionsCount", 0);
                    }

                    if (attempt.getResult() != null) {
                        map.put("percentage", attempt.getResult().getPercentage());
                        map.put("passed", attempt.getResult().isPassed());
                        map.put("earnedPoints", attempt.getResult().getEarnedPoints());
                        map.put("totalPoints", attempt.getResult().getTotalPoints());
                        map.put("correctAnswersCount", attempt.getResult().getCorrectAnswersCount());

                        // Correction complète question/réponse
                        List<Map<String, Object>> questionResults =
                                attempt.getResult().getQuestionResults().stream()
                                        .map(qr -> {
                                            Map<String, Object> qrMap = new HashMap<>();
                                            qrMap.put("questionId", qr.getQuestion().getId());
                                            qrMap.put("questionContent", qr.getQuestion().getContent());
                                            qrMap.put("questionType", qr.getQuestion().getType().name());
                                            qrMap.put("isCorrect", qr.isCorrect());
                                            qrMap.put("earnedPoints", qr.getEarnedPoints());
                                            qrMap.put("explanation", qr.getExplanation());

                                            qrMap.put("yourAnswers", qr.getUserAnswers().stream()
                                                    .map(Answer::getContent)
                                                    .collect(Collectors.toList()));

                                            qrMap.put("yourAnswerIds", qr.getUserAnswers().stream()
                                                    .map(a -> a.getId().toString())
                                                    .collect(Collectors.toList()));

                                            qrMap.put("correctAnswers", qr.getCorrectAnswers().stream()
                                                    .map(Answer::getContent)
                                                    .collect(Collectors.toList()));

                                            qrMap.put("correctAnswerIds", qr.getCorrectAnswers().stream()
                                                    .map(a -> a.getId().toString())
                                                    .collect(Collectors.toList()));

                                            List<UUID> userSelectedIds = qr.getUserAnswers().stream()
                                                    .map(Answer::getId).collect(Collectors.toList());

                                            List<Map<String, Object>> answerDetails =
                                                    qr.getQuestion().getAnswers().stream()
                                                            .map(a -> {
                                                                Map<String, Object> ad = new HashMap<>();
                                                                ad.put("id", a.getId().toString());
                                                                ad.put("content", a.getContent());
                                                                ad.put("isCorrect", a.isCorrect());
                                                                ad.put("wasSelected", userSelectedIds.contains(a.getId()));
                                                                ad.put("explanation", a.getAnswerExplanation());
                                                                return ad;
                                                            })
                                                            .collect(Collectors.toList());
                                            qrMap.put("answerDetails", answerDetails);

                                            return qrMap;
                                        })
                                        .collect(Collectors.toList());

                        map.put("questionResults", questionResults);
                    } else {
                        map.put("percentage", 0.0);
                        map.put("passed", false);
                        map.put("questionResults", List.of());
                    }

                    return map;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public QuizResultResponse getResult(UUID attemptId, UUID userId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new AttemptNotFoundException("Tentative non trouvée"));
        if (!attempt.getUserId().equals(userId)) {
            throw new AccessDeniedException("Cette tentative ne vous appartient pas");
        }
        if (attempt.getResult() == null) {
            throw new AttemptNotFoundException("Le résultat n'est pas encore disponible");
        }
        return correctionService.toResultResponse(attempt.getResult());
    }
}