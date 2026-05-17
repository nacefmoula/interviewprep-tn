package com.microservice.interviewservice.dto.live;

import java.util.List;

import com.microservice.interviewservice.ennum.LiveAgentMode;
import com.microservice.interviewservice.ennum.LiveInterviewPhase;
import com.microservice.interviewservice.model.Question;

public record LiveActionResponse(
        boolean sessionFinished,
        String transcript,
        Double overallScore,
        Double communicationScore,
        Double hesitationScore,
        Double stressProxyScore,
        Double confidenceProxyScore,
        String feedback,
        Question nextQuestion,
        Long reportId,
        LiveInterviewPhase phase,
        LiveAgentMode agentMode,
        String agentMessage,
        String encouragement,
        boolean shouldSpeakAgentMessage,
        List<LiveTimelinePoint> stressTimeline
) {}
