package com.microservice.interviewservice.service;

import java.util.List;

import com.microservice.interviewservice.dto.ai.AiEvaluationResult;
import com.microservice.interviewservice.dto.live.AgentUtterance;
import com.microservice.interviewservice.dto.live.CandidateProfile;
import com.microservice.interviewservice.dto.live.ConversationTurn;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.Question;

public interface RecruiterAgentService {

    AgentUtterance buildGreeting(InterviewSession session);

    CandidateProfile extractProfile(InterviewSession session, String selfIntroductionTranscript);

    AgentUtterance buildPostIntroPrompt(InterviewSession session,
                                        CandidateProfile profile,
                                        Question firstQuestion,
                                        List<ConversationTurn> history);

    AgentUtterance buildTurnResponse(InterviewSession session,
                                     CandidateProfile profile,
                                     Question currentQuestion,
                                     String transcript,
                                     AiEvaluationResult evaluation,
                                     BehavioralMetricsService.Metrics metrics,
                                     Question nextQuestion,
                                     boolean finished,
                                     List<ConversationTurn> history);
}
