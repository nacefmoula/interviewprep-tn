package com.microservice.interviewservice.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.microservice.interviewservice.model.LiveInterviewSession;

@Repository
public interface LiveInterviewSessionRepository extends JpaRepository<LiveInterviewSession, Long> {
    Optional<LiveInterviewSession> findByInterviewSessionId(Long interviewSessionId);
}