package com.microservice.interviewservice.dto.live;

public record VoiceSynthesisResult(
        byte[] audio,
        String contentType
) {}
