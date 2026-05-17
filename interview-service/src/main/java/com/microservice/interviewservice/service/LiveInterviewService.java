package com.microservice.interviewservice.service;

import com.microservice.interviewservice.dto.live.LiveStatusResponse;

import com.microservice.interviewservice.dto.live.CommitTurnRequest;
import com.microservice.interviewservice.dto.live.LiveActionResponse;
import com.microservice.interviewservice.dto.live.LiveStartResponse;
import com.microservice.interviewservice.model.PerformanceReport;

public interface LiveInterviewService {
    LiveStartResponse start(Long sessionId, String userId);
    LiveStatusResponse getStatus(Long sessionId, String userId);
    LiveActionResponse commitTurn(Long sessionId, CommitTurnRequest request, String userId);
    PerformanceReport end(Long sessionId, String userId);
}