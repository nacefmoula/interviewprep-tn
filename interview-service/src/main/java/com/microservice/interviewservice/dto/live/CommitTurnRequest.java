package com.microservice.interviewservice.dto.live;

import java.util.List;

import com.microservice.interviewservice.ennum.LiveAgentMode;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CommitTurnRequest(
        Long questionId,
        @NotBlank String pcm16Base64,
        @NotNull @Min(0) Integer durationSeconds,
        AudioMetrics audioMetrics,
        FaceMetrics faceMetrics,
        List<LiveTimelinePoint> stressTimeline,
        String partialTranscript,
        LiveAgentMode turnMode
) {
    public record AudioMetrics(
            Double averageVolume,
            Double maxVolume,
            Double silenceRatio
    ) {}

    public record FaceMetrics(
            Double blinkRate,
            Double gazeStabilityScore,
            Double headMotionScore,
            Double browTensionScore,
            Double mouthTensionScore,
            List<LiveTimelinePoint> stressTimeline
    ) {}
}
