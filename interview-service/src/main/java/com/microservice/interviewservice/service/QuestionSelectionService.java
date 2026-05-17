package com.microservice.interviewservice.service;

import com.microservice.interviewservice.ennum.InterviewTypeEnum;
import com.microservice.interviewservice.ennum.QuestionTypeEnum;
import com.microservice.interviewservice.model.InterviewSession;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class QuestionSelectionService {

    private final QuestionRepository questionRepository;
    private final Random random = new Random();

    public Question selectFirstQuestion(InterviewSession session) {
        List<Question> candidates = questionRepository
                .findByTypeAndIndustryAndDifficultyAndIsActiveTrue(
                        mapToQuestionType(session.getType()),
                        session.getIndustry(),
                        session.getTargetLevel());
        if (candidates.isEmpty()) return null;
        return candidates.get(random.nextInt(candidates.size()));
    }

    public Question selectNextQuestion(InterviewSession session, List<Long> alreadyAskedIds) {
        return questionRepository
                .findByTypeAndIndustryAndDifficultyAndIsActiveTrue(
                        mapToQuestionType(session.getType()),
                        session.getIndustry(),
                        session.getTargetLevel())
                .stream()
                .filter(q -> !alreadyAskedIds.contains(q.getId()))
                .findFirst()
                .orElse(null);
    }

    /** Maps session interview type → question type stored in DB. */
    public static QuestionTypeEnum mapToQuestionType(InterviewTypeEnum t) {
        return switch (t) {
            case BEHAVIORAL -> QuestionTypeEnum.BEHAVIORAL;
            case TECHNICAL  -> QuestionTypeEnum.TECHNICAL;
            case CASE_STUDY -> QuestionTypeEnum.CASE_STUDY;
        };
    }
}