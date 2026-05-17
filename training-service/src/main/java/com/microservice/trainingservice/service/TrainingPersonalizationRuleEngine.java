package com.microservice.trainingservice.service;

import com.microservice.trainingservice.event.InterviewSessionCompletedEvent;
import com.microservice.trainingservice.model.TrainingCategory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class TrainingPersonalizationRuleEngine {

    public List<PersonalizedModulePlan> buildDefaultPlan() {
        List<PersonalizedModulePlan> plans = new ArrayList<>();
        int index = 0;
        for (TrainingCategory category : TrainingCategory.values()) {
            plans.add(new PersonalizedModulePlan(
                category,
                categoryTitle(category),
                "Starter module for " + categoryTitle(category).toLowerCase(Locale.ROOT),
                5,
                100,
                index == 0
            ));
            index++;
        }
        return plans;
    }

    private static final Logger log = LoggerFactory.getLogger(TrainingPersonalizationRuleEngine.class);
    private final RestTemplate restTemplate = new RestTemplate();

    public record AiPathRequest(double globalScore, String preparationLevel, int totalSessionsCompleted) {}
    public record AiPathResponse(List<PersonalizedModulePlan> plans) {}

    public List<PersonalizedModulePlan> buildPlan(InterviewSessionCompletedEvent event) {
        double score = event.getGlobalScore() == null ? 60.0 : event.getGlobalScore();
        String prepLevel = event.getPreparationLevel() == null
            ? ""
            : event.getPreparationLevel().toLowerCase(Locale.ROOT);
        int sessions = event.getTotalSessionsCompleted() == null ? 0 : event.getTotalSessionsCompleted();

        try {
            String aiModelUrl = System.getenv("AI_MODEL_URL");
            if (aiModelUrl == null || aiModelUrl.isBlank()) {
                aiModelUrl = "http://localhost:8000/predict-path";
            }
            AiPathRequest request = new AiPathRequest(score, prepLevel, sessions);
            ResponseEntity<AiPathResponse> response = restTemplate.postForEntity(
                aiModelUrl, request, AiPathResponse.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().plans() != null) {
                log.info("Successfully fetched AI path from local model");
                return response.getBody().plans();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch path from AI model, falling back to rule engine", e);
        }

        return buildFallbackPlan(score, prepLevel, sessions);
    }

    private List<PersonalizedModulePlan> buildFallbackPlan(double score, String prepLevel, int sessions) {
        Map<TrainingCategory, Integer> priority = new EnumMap<>(TrainingCategory.class);
        for (TrainingCategory category : TrainingCategory.values()) {
            priority.put(category, 50);
        }

        if (score < 55) {
            bump(priority, TrainingCategory.COMMUNICATION, 25);
            bump(priority, TrainingCategory.CONTENT_PREP, 20);
            bump(priority, TrainingCategory.STRESS_MANAGEMENT, 15);
        } else if (score < 70) {
            bump(priority, TrainingCategory.COMMUNICATION, 20);
            bump(priority, TrainingCategory.BODY_LANGUAGE, 15);
            bump(priority, TrainingCategory.CONTENT_PREP, 10);
        } else if (score < 85) {
            bump(priority, TrainingCategory.BODY_LANGUAGE, 18);
            bump(priority, TrainingCategory.INDUSTRY_SPECIFIC, 14);
            bump(priority, TrainingCategory.COMMUNICATION, 8);
        } else {
            bump(priority, TrainingCategory.INDUSTRY_SPECIFIC, 18);
            bump(priority, TrainingCategory.BODY_LANGUAGE, 12);
            bump(priority, TrainingCategory.COMMUNICATION, 6);
        }

        if (prepLevel.contains("beginner") || prepLevel.contains("junior")) {
            bump(priority, TrainingCategory.CONTENT_PREP, 20);
            bump(priority, TrainingCategory.STRESS_MANAGEMENT, 15);
            bump(priority, TrainingCategory.COMMUNICATION, 10);
        } else if (prepLevel.contains("intermediate")) {
            bump(priority, TrainingCategory.BODY_LANGUAGE, 10);
            bump(priority, TrainingCategory.INDUSTRY_SPECIFIC, 8);
        } else if (prepLevel.contains("advanced") || prepLevel.contains("senior")) {
            bump(priority, TrainingCategory.INDUSTRY_SPECIFIC, 18);
            bump(priority, TrainingCategory.BODY_LANGUAGE, 8);
        }

        if (sessions < 3) {
            bump(priority, TrainingCategory.STRESS_MANAGEMENT, 12);
            bump(priority, TrainingCategory.CONTENT_PREP, 8);
        } else if (sessions >= 15) {
            bump(priority, TrainingCategory.INDUSTRY_SPECIFIC, 10);
        }

        List<TrainingCategory> orderedCategories = new ArrayList<>(List.of(TrainingCategory.values()));
        orderedCategories.sort(
            Comparator.comparingInt((TrainingCategory c) -> priority.getOrDefault(c, 0)).reversed()
                .thenComparingInt(Enum::ordinal)
        );

        List<PersonalizedModulePlan> plans = new ArrayList<>();
        int weaknessBoost = (int) Math.max(0, Math.round((70 - score) / 5.0));
        for (int i = 0; i < orderedCategories.size(); i++) {
            TrainingCategory category = orderedCategories.get(i);
            int lessons = Math.max(4, 5 + i + (score < 60 ? 1 : 0));
            int xpReward = 80 + (i * 15) + weaknessBoost * 5;
            plans.add(new PersonalizedModulePlan(
                category,
                categoryTitle(category),
                categoryDescription(category, score, prepLevel),
                lessons,
                xpReward,
                i == 0
            ));
        }

        return plans;
    }

    public int recommendXpThreshold(InterviewSessionCompletedEvent event) {
        double score = event.getGlobalScore() == null ? 60.0 : event.getGlobalScore();
        if (score < 55) {
            return 300;
        }
        if (score < 70) {
            return 500;
        }
        if (score < 85) {
            return 700;
        }
        return 900;
    }

    private void bump(Map<TrainingCategory, Integer> priority, TrainingCategory category, int increment) {
        priority.put(category, priority.getOrDefault(category, 0) + increment);
    }

    private String categoryTitle(TrainingCategory category) {
        return switch (category) {
            case COMMUNICATION -> "Communication Excellence";
            case STRESS_MANAGEMENT -> "Stress Management";
            case CONTENT_PREP -> "Content Preparation";
            case BODY_LANGUAGE -> "Body Language Mastery";
            case INDUSTRY_SPECIFIC -> "Industry-Specific Readiness";
        };
    }

    private String categoryDescription(TrainingCategory category, double score, String prepLevel) {
        String levelHint = prepLevel.isBlank() ? "your current level" : prepLevel;
        return switch (category) {
            case COMMUNICATION ->
                "Improve verbal structure, clarity, and confidence based on your recent score (" + score + ") and " + levelHint + " profile.";
            case STRESS_MANAGEMENT ->
                "Build routines to stay calm under pressure and keep consistent performance through real interview stressors.";
            case CONTENT_PREP ->
                "Sharpen answer frameworks and domain stories to produce stronger, high-signal responses.";
            case BODY_LANGUAGE ->
                "Optimize posture, eye contact, pacing, and non-verbal signals to improve interviewer perception.";
            case INDUSTRY_SPECIFIC ->
                "Practice role-specific scenarios and market context for stronger relevance in target interviews.";
        };
    }

    public record PersonalizedModulePlan(
        TrainingCategory category,
        String title,
        String description,
        int lessons,
        int xpReward,
        boolean unlocked
    ) {
    }
}
