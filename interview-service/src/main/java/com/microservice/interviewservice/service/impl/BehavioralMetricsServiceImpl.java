package com.microservice.interviewservice.service.impl;

import org.springframework.stereotype.Service;

import com.microservice.interviewservice.dto.live.CommitTurnRequest;
import com.microservice.interviewservice.service.BehavioralMetricsService;

@Service
public class BehavioralMetricsServiceImpl implements BehavioralMetricsService {

    @Override
    public Metrics compute(String transcript,
                           Integer durationSeconds,
                           CommitTurnRequest.AudioMetrics audio,
                           CommitTurnRequest.FaceMetrics face) {

        double silence = clamp(nz(audio == null ? null : audio.silenceRatio(), 0.25));
        double avgVolume = clamp(nz(audio == null ? null : audio.averageVolume(), 0.04) * 8.0);
        double blink = clamp(nz(face == null ? null : face.blinkRate(), 0.20));
        double gaze = clamp(nz(face == null ? null : face.gazeStabilityScore(), 0.65));
        double head = clamp(nz(face == null ? null : face.headMotionScore(), 0.25));
        double brow = clamp(nz(face == null ? null : face.browTensionScore(), 0.25));
        double mouth = clamp(nz(face == null ? null : face.mouthTensionScore(), 0.25));

        int words = countWords(transcript);
        double pace = paceScore(words, durationSeconds);
        double structure = words >= 20 ? 0.80 : words >= 10 ? 0.60 : 0.35;

        double communication = clamp(
                0.40 * pace +
                0.20 * structure +
                0.20 * (1.0 - silence) +
                0.10 * gaze +
                0.10 * avgVolume
        );

        double hesitation = clamp(
                0.55 * silence +
                0.25 * (1.0 - pace) +
                0.20 * blink
        );

        double stressProxy = clamp(
                0.20 * silence +
                0.20 * head +
                0.20 * brow +
                0.20 * mouth +
                0.20 * (1.0 - gaze)
        );

        double confidence = clamp(
                0.35 * gaze +
                0.25 * pace +
                0.20 * (1.0 - silence) +
                0.20 * avgVolume
        );

        return new Metrics(
                round(communication),
                round(hesitation),
                round(stressProxy),
                round(confidence)
        );
    }

    private int countWords(String s) {
        if (s == null || s.isBlank()) return 0;
        return s.trim().split("\\s+").length;
    }

    private double paceScore(int words, Integer durationSeconds) {
        if (words == 0 || durationSeconds == null || durationSeconds <= 0) return 0.30;
        double wpm = words * 60.0 / durationSeconds;
        if (wpm < 80) return 0.45;
        if (wpm <= 170) return 0.85;
        if (wpm <= 200) return 0.65;
        return 0.40;
    }

    private double nz(Double value, double fallback) {
        return value == null ? fallback : value;
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}