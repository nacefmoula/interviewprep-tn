package com.microservice.interviewservice.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.microservice.interviewservice.dto.ai.AiEvaluationResult;
import com.microservice.interviewservice.dto.request.SubmitResponseRequest;
import com.microservice.interviewservice.dto.response.SubmitResponseResult;
import com.microservice.interviewservice.ennum.SessionStatusEnum;
import com.microservice.interviewservice.exception.BusinessException;
import com.microservice.interviewservice.exception.ResourceNotFoundException;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.model.Response;
import com.microservice.interviewservice.repository.InterviewSessionRepository;
import com.microservice.interviewservice.repository.QuestionRepository;
import com.microservice.interviewservice.repository.ResponseRepository;
import com.microservice.interviewservice.service.AiEvaluationService;   // NEW
import com.microservice.interviewservice.service.AiQuestionService;      // NEW
import com.microservice.interviewservice.service.ResponseService;
import com.microservice.interviewservice.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ResponseServiceImpl implements ResponseService {

    private final InterviewSessionRepository sessionRepository;
    private final QuestionRepository         questionRepository;
    private final ResponseRepository         responseRepository;
    private final AiQuestionService          aiQuestionService;    // replaces QuestionSelectionService
    private final AiEvaluationService        aiEvaluationService;  // replaces computeScore()

    @Override
    public SubmitResponseResult submitResponse(Long sessionId,
                                               SubmitResponseRequest req,
                                               String userId) {
        // 1. Load session with ownership check
        InterviewSession session = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Session not found [id=" + sessionId + "] for current user."));

        // 2. Must be IN_PROGRESS to accept answers
        if (session.getStatus() != SessionStatusEnum.IN_PROGRESS) {
            throw new BusinessException(
                    "Cannot submit a response. Session status is: " + session.getStatus());
        }

        // 3. Load the question
        Question question = questionRepository.findById(req.getQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Question not found [id=" + req.getQuestionId() + "]"));

        // 4. AI evaluation — replaces the old placeholder computeScore()
        AiEvaluationResult eval = aiEvaluationService.evaluate(question, req.getTranscription());

        // 5. Build and save Response (now includes aiFeedback)
        Response response = Response.builder()
                .session(session)
                .question(question)
                .transcription(req.getTranscription())
                .audioFileUrl(req.getAudioFileUrl())
                .videoFileUrl(req.getVideoFileUrl())
                .durationSeconds(req.getDurationSeconds())
                .wordCount(req.getWordCount())
                .overallScore(eval.overallScore())
                .aiFeedback(eval.feedback())          // NEW
                .build();

        Response saved = responseRepository.save(response);
        log.info("Response saved [id={}, sessionId={}, score={}, hasAiFeedback={}]",
                saved.getId(), sessionId, eval.overallScore(), eval.feedback() != null);

        // 6. Update question usage stats
        questionRepository.incrementTimesUsed(question.getId());

        // 7. AI selects next question (exclude all already-answered IDs)
      List<Long> askedIds = responseRepository.findQuestionIdsBySessionId(sessionId);
Question nextQuestion = aiQuestionService.generateQuestion(session, askedIds);

return SubmitResponseResult.builder()
        .responseId(saved.getId())
        .sessionId(sessionId)
        .questionId(question.getId())
        .overallScore(eval.overallScore())
        .nextQuestion(nextQuestion)
        .build();
    }
}