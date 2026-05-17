package com.quizservice.repository;

import com.quizservice.enums.AttemptStatus;
import com.quizservice.model.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(UUID userId);

    List<QuizAttempt> findByUserIdAndQuizId(UUID userId, UUID quizId);

    Optional<QuizAttempt> findByUserIdAndQuizIdAndStatus(UUID userId, UUID quizId, AttemptStatus status);

    // Nombre de tentatives d'un user pour un quiz
    long countByUserIdAndQuizId(UUID userId, UUID quizId);

    @Query("SELECT a FROM QuizAttempt a WHERE a.userId = :userId AND a.quiz.id = :quizId " +
            "ORDER BY a.startedAt DESC")
    List<QuizAttempt> findLatestAttempts(@Param("userId") UUID userId,
                                         @Param("quizId") UUID quizId);

    List<QuizAttempt> findByUserId(UUID userId); // Pas de "static" ici !

}