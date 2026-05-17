// service/ReportGenerationService.java
package com.microservice.interviewservice.service;

import com.microservice.interviewservice.model.PerformanceReport;

public interface ReportGenerationService {
    PerformanceReport generateForSession(Long sessionId);
}