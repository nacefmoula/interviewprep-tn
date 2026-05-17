package com.microservice.interviewservice.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.microservice.interviewservice.model.ProgressTracker;

@Repository
public interface ProgressTrackerRepository extends JpaRepository<ProgressTracker, Long> {
    Optional<ProgressTracker> findByUserId(String userId);
}