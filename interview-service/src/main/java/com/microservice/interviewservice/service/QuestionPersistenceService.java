package com.microservice.interviewservice.service;

import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Saves AI-generated questions in a BRAND NEW transaction,
 * completely isolated from any outer transaction.
 *
 * This is critical: AiQuestionServiceImpl has no @Transactional,
 * so if Groq parsing fails, no DB transaction is ever opened.
 * When save is called, this opens its own fresh transaction.
 * saveAndFlush() immediately commits and reveals the real SQL error if any.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionPersistenceService {

    private final QuestionRepository questionRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Question saveGeneratedQuestion(Question question) {
        log.debug("Saving generated question [type={}, industry={}, difficulty={}, textLen={}]",
                question.getType(),
                question.getIndustry(),
                question.getDifficulty(),
                question.getText() == null ? 0 : question.getText().length());
        try {
            Question saved = questionRepository.saveAndFlush(question);
            log.debug("Question saved successfully [id={}]", saved.getId());
            return saved;
        } catch (Exception e) {
            log.error("SAVE FAILED — type={}, industry={}, difficulty={}, isActive={}, timesUsed={}, textPresent={}, error={}",
                    question.getType(),
                    question.getIndustry(),
                    question.getDifficulty(),
                    question.getIsActive(),
                    question.getTimesUsed(),
                    question.getText() != null && !question.getText().isBlank(),
                    e.getMessage());
            throw e;
        }
    }
}