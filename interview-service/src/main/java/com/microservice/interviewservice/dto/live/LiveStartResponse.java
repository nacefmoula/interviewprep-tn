package com.microservice.interviewservice.dto.live;

import com.microservice.interviewservice.ennum.LiveAgentMode;
import com.microservice.interviewservice.ennum.LiveInterviewPhase;
import com.microservice.interviewservice.ennum.LiveSessionStatus;
import com.microservice.interviewservice.model.Question;

public record LiveStartResponse(
        Long sessionId,
        Integer answeredCount,
        Integer maxQuestions,
        Question currentQuestion,
        LiveSessionStatus liveStatus,
        LiveInterviewPhase phase,
        LiveAgentMode agentMode,
        String agentGreeting,
        String agentMessage,
        boolean useNeuralTts
) {}
