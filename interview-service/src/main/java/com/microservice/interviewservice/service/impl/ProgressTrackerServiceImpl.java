// service/impl/ProgressTrackerServiceImpl.java
package com.microservice.interviewservice.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.microservice.interviewservice.model.PerformanceReport;
import com.microservice.interviewservice.model.ProgressTracker;
import com.microservice.interviewservice.repository.ProgressTrackerRepository;
import com.microservice.interviewservice.service.ProgressTrackerService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProgressTrackerServiceImpl implements ProgressTrackerService {

    private final ProgressTrackerRepository trackerRepository;

    @Override
    public ProgressTracker updateProgress(String userId, PerformanceReport report) {
        // Find existing tracker or create a fresh one
        ProgressTracker tracker = trackerRepository.findByUserId(userId)
                .orElseGet(() -> ProgressTracker.builder()
                        .userId(userId)
                        .totalSessionsCompleted(0)
                        .averageScore(0.0)
                        .bestScore(0.0)
                        .build());

        tracker.updateFromReport(report);
        ProgressTracker saved = trackerRepository.save(tracker);

        log.info("ProgressTracker updated [userId={}, sessions={}, avg={}, best={}, level={}]",
                userId, saved.getTotalSessionsCompleted(), saved.getAverageScore(),
                saved.getBestScore(), saved.getCurrentLevel());

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public ProgressTracker getProgressForUser(String userId) {
        return trackerRepository.findByUserId(userId)
                .orElseGet(() -> ProgressTracker.builder()
                        .userId(userId)
                        .totalSessionsCompleted(0)
                        .averageScore(0.0)
                        .bestScore(0.0)
                        .build());
    }
}