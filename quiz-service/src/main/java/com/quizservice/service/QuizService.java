package com.quizservice.service;

import com.quizservice.dto.request.CreateQuizRequest;
import com.quizservice.dto.request.CreateQuestionRequest;
import com.quizservice.dto.request.CreateAnswerRequest;
import com.quizservice.dto.response.QuizResponse;
import com.quizservice.dto.response.QuestionResponse;
import com.quizservice.dto.response.AnswerResponse;
import com.quizservice.enums.QuizDifficulty;
import com.quizservice.enums.QuizStatus;
import com.quizservice.exception.QuizNotFoundException;
import com.quizservice.model.*;
import com.quizservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;

    // ── Création ──────────────────────────────────────────────

    public QuizResponse createQuiz(CreateQuizRequest request, UUID createdBy) {
        // 1. Initialiser le Quiz de base
        Quiz quiz = Quiz.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .moduleId(request.getModuleId())
                .category(request.getCategory())
                .difficulty(request.getDifficulty())
                // On garde le != null car timeLimit est un objet Integer
                .timeLimit((request.getTimeLimit() != null && request.getTimeLimit() > 0) ? request.getTimeLimit() : 15)
                .maxAttempts(request.getMaxAttempts())
                .passingScore(request.getPassingScore())
                .shuffleQuestions(request.isShuffleQuestions())
                .shuffleAnswers(request.isShuffleAnswers())
                .showCorrectionImmediately(request.isShowCorrectionImmediately())
                .createdBy(createdBy)
                .status(QuizStatus.PUBLISHED)
                .questions(new ArrayList<>())
                .build();

        // 2. Traiter les questions
        if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
            for (CreateQuestionRequest qReq : request.getQuestions()) {

                // Pas de != null ici car getPoints() est un int primitif
                int questionPoints = qReq.getPoints() > 0 ? qReq.getPoints() : 10;

                Question question = Question.builder()
                        .content(qReq.getContent())
                        .type(qReq.getType())
                        .points(questionPoints)
                        .orderIndex(qReq.getOrderIndex())
                        .explanation(qReq.getExplanation())
                        .quiz(quiz)
                        .answers(new ArrayList<>())
                        .build();

                // 3. Traiter les réponses
                if (qReq.getAnswers() != null) {
                    for (CreateAnswerRequest aReq : qReq.getAnswers()) {
                        Answer answer = Answer.builder()
                                .content(aReq.getContent())
                                .isCorrect(aReq.isCorrect())
                                .answerExplanation(aReq.getAnswerExplanation())
                                .question(question)
                                .build();
                        question.getAnswers().add(answer);
                    }
                }
                quiz.getQuestions().add(question);
            }
        }

        // 4. Sauvegarder
        Quiz savedQuiz = quizRepository.save(quiz);

        return toResponse(savedQuiz, true);
    }

    public QuestionResponse addQuestion(UUID quizId, CreateQuestionRequest req, UUID userId) {
        Quiz quiz = getQuizOrThrow(quizId);
        checkOwnership(quiz, userId);

        boolean hasCorrect = req.getAnswers().stream().anyMatch(CreateAnswerRequest::isCorrect);
        if (!hasCorrect) {
            throw new IllegalArgumentException("La question doit avoir au moins une bonne réponse");
        }

        // Pas de != null ici car getPoints() est un int primitif
        int questionPoints = req.getPoints() > 0 ? req.getPoints() : 10;

        Question question = Question.builder()
                .content(req.getContent())
                .type(req.getType())
                .points(questionPoints)
                .orderIndex(req.getOrderIndex())
                .explanation(req.getExplanation())
                .hint(req.getHint())
                .timeLimitSeconds(req.getTimeLimitSeconds())
                .quiz(quiz)
                .build();

        question = questionRepository.save(question);

        final Question savedQuestion = question;
        List<Answer> answers = req.getAnswers().stream()
                .map(a -> Answer.builder()
                        .content(a.getContent())
                        .isCorrect(a.isCorrect())
                        .answerExplanation(a.getAnswerExplanation())
                        .question(savedQuestion)
                        .build())
                .collect(Collectors.toList());

        answerRepository.saveAll(answers);
        question.setAnswers(answers);

        return toQuestionResponse(question, false);
    }

    // ── Modification quiz ───────────────────────────────────────────────
    public QuizResponse updateQuiz(UUID id, CreateQuizRequest request, UUID userId) {
        Quiz quiz = getQuizOrThrow(id);
        checkOwnership(quiz, userId);

        quiz.setTitle(request.getTitle());
        quiz.setDescription(request.getDescription());
        quiz.setCategory(request.getCategory());
        quiz.setDifficulty(request.getDifficulty());
        quiz.setTimeLimit(request.getTimeLimit());
        quiz.setPassingScore(request.getPassingScore());
        quiz.setMaxAttempts(request.getMaxAttempts());

        return toResponse(quizRepository.save(quiz), true);
    }

    // ── Lecture ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<QuizResponse> getPublishedQuizzes(Pageable pageable) {
        return quizRepository.findByStatus(QuizStatus.PUBLISHED, pageable)
                .map(q -> toResponse(q, false));
    }

    @Transactional(readOnly = true)
    public Page<QuizResponse> getAllQuizzesForAdmin(Pageable pageable) {
        return quizRepository.findAll(pageable)
                .map(q -> toResponse(q, true));
    }
    public Page<QuizResponse> getQuizzesByModule(Long moduleId, Pageable pageable) {
        return quizRepository.findByModuleIdAndStatus(moduleId, QuizStatus.PUBLISHED, pageable)
                .map(q -> toResponse(q, false));
    }

    @Transactional(readOnly = true)
    public QuizResponse getQuizForStudent(UUID quizId) {
        Quiz quiz = getQuizOrThrow(quizId);
        return toResponse(quiz, false);
    }

    @Transactional(readOnly = true)
    public QuizResponse getQuizForAdmin(UUID quizId) {
        Quiz quiz = getQuizOrThrow(quizId);
        return toResponse(quiz, true);
    }

    // ── Modification ──────────────────────────────────────────

    public QuizResponse publishQuiz(UUID quizId, UUID userId) {
        Quiz quiz = getQuizOrThrow(quizId);
        checkOwnership(quiz, userId);

        long questionCount = questionRepository.countByQuizId(quizId);

        if (questionCount == 0) {
            throw new IllegalStateException("Impossible de publier un quiz sans questions");
        }

        quiz.setStatus(QuizStatus.PUBLISHED);
        return toResponse(quizRepository.save(quiz), true);
    }

    public void deleteQuiz(UUID quizId, UUID userId, boolean isAdmin) {
        Quiz quiz = getQuizOrThrow(quizId);
        if (!isAdmin) checkOwnership(quiz, userId);
        quizRepository.delete(quiz);
    }

    // ── Helpers ───────────────────────────────────────────────

    private Quiz getQuizOrThrow(UUID id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> new QuizNotFoundException("Quiz non trouvé : " + id));
    }

    private void checkOwnership(Quiz quiz, UUID userId) {
        if (!quiz.getCreatedBy().equals(userId)) {
            throw new AccessDeniedException("Vous n'êtes pas le créateur de ce quiz");
        }
    }

    // ── Mappers ───────────────────────────────────────────────

    public QuizResponse toResponse(Quiz quiz, boolean includeCorrect) {
        List<QuestionResponse> questions = null;
        int ptsTotal = 0;

        if (quiz.getQuestions() != null) {
            questions = quiz.getQuestions().stream()
                    .map(q -> toQuestionResponse(q, includeCorrect))
                    .collect(Collectors.toList());

            // Calcul dynamique des points pour l'affichage
            ptsTotal = quiz.getQuestions().stream()
                    .mapToInt(q -> q.getPoints() > 0 ? q.getPoints() : 10)
                    .sum();
        }

        int nbQuestions = (quiz.getQuestions() != null) ? quiz.getQuestions().size() : 0;

        return QuizResponse.builder()
                .id(quiz.getId())
                .title(quiz.getTitle())
                .description(quiz.getDescription())
                .moduleId(quiz.getModuleId())
                .category(quiz.getCategory())
                .difficulty(quiz.getDifficulty())
                .timeLimit(quiz.getTimeLimit())
                .maxAttempts(quiz.getMaxAttempts())
                .passingScore(quiz.getPassingScore())
                .status(quiz.getStatus())
                .shuffleQuestions(quiz.isShuffleQuestions())
                .shuffleAnswers(quiz.isShuffleAnswers())
                .showCorrectionImmediately(quiz.isShowCorrectionImmediately())
                .createdBy(quiz.getCreatedBy())
                .totalQuestions(nbQuestions)
                .totalPoints(ptsTotal)
                .createdAt(quiz.getCreatedAt())
                .questions(questions)
                .build();
    }

    public QuestionResponse toQuestionResponse(Question q, boolean includeCorrect) {
        List<AnswerResponse> answers = q.getAnswers() == null ? null
                : q.getAnswers().stream()
                .map(a -> AnswerResponse.builder()
                        .id(a.getId())
                        .content(a.getContent())
                        .isCorrect(includeCorrect ? a.isCorrect() : null)
                        .answerExplanation(includeCorrect ? a.getAnswerExplanation() : null)
                        .build())
                .collect(Collectors.toList());

        return QuestionResponse.builder()
                .id(q.getId())
                .content(q.getContent())
                .type(q.getType())
                .points(q.getPoints())
                .orderIndex(q.getOrderIndex())
                .hint(q.getHint())
                .explanation(includeCorrect ? q.getExplanation() : null)
                .answers(answers)
                .build();
    }


}