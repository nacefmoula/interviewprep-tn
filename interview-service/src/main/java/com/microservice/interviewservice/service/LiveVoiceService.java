package com.microservice.interviewservice.service;

import com.microservice.interviewservice.dto.live.LiveVoiceSpeakRequest;
import com.microservice.interviewservice.dto.live.VoiceSynthesisResult;

public interface LiveVoiceService {
    VoiceSynthesisResult speak(LiveVoiceSpeakRequest request);
    boolean isAvailable();
}
