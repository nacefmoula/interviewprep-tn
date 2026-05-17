package com.microservice.interviewservice.repository;

import com.microservice.interviewservice.model.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {

    Optional<InterviewSession> findByIdAndUserId(Long id, String userId);

    List<InterviewSession> findAllByUserIdOrderByCreatedAtDesc(String userId);
}