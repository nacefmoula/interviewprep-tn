package com.microservice.interviewservice.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.QuestionTypeEnum;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.repository.QuestionRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionRepository questionRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Question>> getQuestions(
        @RequestParam(required = false) QuestionTypeEnum type,
        @RequestParam(required = false) IndustryEnum industry,
        @RequestParam(required = false) CareerLevelEnum difficulty,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(
            questionRepository.findAllFiltered(type, industry, difficulty, pageable)
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Question> createQuestion(@RequestBody Question question) {
        return ResponseEntity.status(201).body(questionRepository.save(question));
    }
}