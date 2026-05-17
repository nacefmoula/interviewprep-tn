package com.interviewprep.community_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanySummaryDTO {
    private String companyName;
    private long totalReviews;
    private double averageRating;
    private String difficultyLevel;      // "Easy", "Moderate", "Hard", "Very hard"
    private List<String> commonTopics;   // 3-5 topics
    private List<String> topTips;        // 3 actionable tips
    private String overallSentiment;     // 1 sentence
    private boolean fromCache;
    private LocalDateTime generatedAt;
}
