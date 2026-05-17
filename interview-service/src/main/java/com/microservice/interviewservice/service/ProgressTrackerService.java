// service/ProgressTrackerService.java
package com.microservice.interviewservice.service;

import com.microservice.interviewservice.model.PerformanceReport;
import com.microservice.interviewservice.model.ProgressTracker;

public interface ProgressTrackerService {
    ProgressTracker updateProgress(String userId, PerformanceReport report);
    ProgressTracker getProgressForUser(String userId);
}