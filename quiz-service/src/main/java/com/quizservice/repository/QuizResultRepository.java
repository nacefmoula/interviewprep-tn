package com.quizservice.repository;

import com.quizservice.model.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizResultRepository extends JpaRepository<QuizResult, UUID> {

    Optional<QuizResult> findByAttemptId(UUID attemptId);

    // Meilleur score d'un user pour un quiz
    @Query("SELECT r FROM QuizResult r WHERE r.attempt.userId = :userId " +
            "AND r.attempt.quiz.id = :quizId ORDER BY r.percentage DESC")
    List<QuizResult> findBestResults(@Param("userId") UUID userId,
                                     @Param("quizId") UUID quizId);

    // Leaderboard d'un quiz
    @Query("SELECT r FROM QuizResult r WHERE r.attempt.quiz.id = :quizId " +
            "ORDER BY r.percentage DESC, r.timeSpentSeconds ASC")
    List<QuizResult> findLeaderboard(@Param("quizId") UUID quizId);
}