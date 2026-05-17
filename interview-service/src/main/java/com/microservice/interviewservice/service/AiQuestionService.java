package com.microservice.interviewservice.service;

import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.Question;

import java.util.List;

/**
 * Generates the next interview question for a session using the Groq AI API.
 */
public interface AiQuestionService {

    Question generateQuestion(InterviewSession session, List<Long> alreadyAskedIds);

    default Question generateQuestion(InterviewSession session,
                                      List<Long> alreadyAskedIds,
                                      String candidateContext) {
        return generateQuestion(session, alreadyAskedIds);
    }
}
