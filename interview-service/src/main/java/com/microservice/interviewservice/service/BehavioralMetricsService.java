package com.microservice.interviewservice.service;

import com.microservice.interviewservice.dto.live.CommitTurnRequest;

public interface BehavioralMetricsService {

    Metrics compute(
            String transcript,
            Integer durationSeconds,
            CommitTurnRequest.AudioMetrics audio,
            CommitTurnRequest.FaceMetrics face
    );

    record Metrics(
            double communicationScore,
            double hesitationScore,
            double stressProxyScore,
            double confidenceProxyScore
    ) {}
}