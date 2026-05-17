package com.quizservice.repository;

import com.quizservice.model.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AnswerRepository extends JpaRepository<Answer, UUID> {
    List<Answer> findByQuestionId(UUID questionId);
    List<Answer> findByQuestionIdAndIsCorrectTrue(UUID questionId);
}