package com.microservice.interviewservice.dto.live;

import com.microservice.interviewservice.ennum.LiveAgentMode;
import com.microservice.interviewservice.ennum.LiveInterviewPhase;

public record AgentUtterance(
        LiveAgentMode agentMode,
        LiveInterviewPhase phase,
        String message,
        String encouragement,
        boolean shouldSpeak
) {}
