package com.microservice.interviewservice.dto.live;

import com.microservice.interviewservice.ennum.LiveAgentMode;
import com.microservice.interviewservice.ennum.LiveInterviewPhase;
import com.microservice.interviewservice.ennum.LiveSessionStatus;
import com.microservice.interviewservice.model.Question;

public record LiveStatusResponse(
        Long sessionId,
        LiveSessionStatus liveStatus,
        Integer answeredCount,
        Integer maxQuestions,
        Question currentQuestion,
        LiveInterviewPhase phase,
        LiveAgentMode agentMode,
        String agentMessage
) {}
