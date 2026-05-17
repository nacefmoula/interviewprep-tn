package com.quizservice.repository;

import com.quizservice.enums.QuizDifficulty;
import com.quizservice.enums.QuizStatus;
import com.quizservice.model.Quiz;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    Page<Quiz> findByStatus(QuizStatus status, Pageable pageable);

    Page<Quiz> findByStatusAndCategory(QuizStatus status, String category, Pageable pageable);

    Page<Quiz> findByStatusAndDifficulty(QuizStatus status, QuizDifficulty difficulty, Pageable pageable);

    Page<Quiz> findByCreatedBy(UUID createdBy, Pageable pageable);

    // Quiz liés à un module de cours
// Change la signature
    // Change la signature
    Page<Quiz> findByModuleIdAndStatus(Long moduleId, QuizStatus status, Pageable pageable);
    @Query("SELECT q FROM Quiz q WHERE q.status = 'PUBLISHED' AND " +
            "(LOWER(q.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(q.category) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Quiz> searchPublished(@Param("keyword") String keyword, Pageable pageable);

    long countByCreatedBy(UUID createdBy);
}