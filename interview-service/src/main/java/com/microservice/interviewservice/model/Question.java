package com.microservice.interviewservice.model;

import com.microservice.interviewservice.ennum.CareerLevelEnum;
import com.microservice.interviewservice.ennum.IndustryEnum;
import com.microservice.interviewservice.ennum.QuestionTypeEnum;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "questions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionTypeEnum type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IndustryEnum industry;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CareerLevelEnum difficulty;   // CareerLevelEnum per class diagram

    @Column(name = "expected_method", columnDefinition = "TEXT")  // Groq returns > 255 chars — was crashing on every first attempt
private String expectedMethod;

@Column(columnDefinition = "TEXT")
private String sampleAnswer;


    private Integer avgAnswerTimeSeconds;
    private Double avgScoreOnPlatform;
    private Integer timesUsed;

    @Column(nullable = false)
    private Boolean isActive;

    @PrePersist
    protected void onCreate() {
        if (isActive == null) isActive = true;
        if (timesUsed == null) timesUsed = 0;
    }
}