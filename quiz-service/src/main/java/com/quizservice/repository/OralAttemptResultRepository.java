package com.quizservice.repository;

import com.quizservice.model.OralAttemptResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OralAttemptResultRepository extends JpaRepository<OralAttemptResult, String> {
    List<OralAttemptResult> findByAttemptId(String attemptId);
}