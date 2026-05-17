package com.microservice.interviewservice.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.QuestionTypeEnum;
import com.microservice.interviewservice.model.Question;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    // Core query used by QuestionSelectionService (P3)
    List<Question> findByTypeAndIndustryAndDifficultyAndIsActiveTrue(
        QuestionTypeEnum type,
        IndustryEnum industry,
        CareerLevelEnum difficulty
    );

    // Admin paginated list with optional filters
    @Query("""
        SELECT q FROM Question q
        WHERE (:type IS NULL OR q.type = :type)
          AND (:industry IS NULL OR q.industry = :industry)
          AND (:difficulty IS NULL OR q.difficulty = :difficulty)
          AND q.isActive = true
        """)
    Page<Question> findAllFiltered(
        @Param("type") QuestionTypeEnum type,
        @Param("industry") IndustryEnum industry,
        @Param("difficulty") CareerLevelEnum difficulty,
        Pageable pageable
    );

    // Increment timesUsed natively — no full entity load needed
    @Modifying
    @Query(value = "UPDATE questions SET times_used = times_used + 1 WHERE id = :id", nativeQuery = true)
    void incrementTimesUsed(@Param("id") Long id);

    List<Question> findByIndustryAndIsActiveTrue(IndustryEnum industry);
}
