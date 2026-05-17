package com.interviewprep.community_service.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.community_service.dto.CompanySummaryDTO;
import com.interviewprep.community_service.model.CompanyReview;
import com.interviewprep.community_service.repository.CompanyReviewRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanySummaryService {

    private static final String CACHE_PREFIX = "community:company:summary:";
    private static final long CACHE_TTL_HOURS = 24;

    private final CompanyReviewRepository reviewRepository;
    private final ChatClient.Builder chatClientBuilder;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private ChatClient chatClient;

    @PostConstruct
    public void init() {
        this.chatClient = chatClientBuilder.build();
    }

    public CompanySummaryDTO getSummary(String companyName) {
        String normalizedName = companyName.trim().toLowerCase();
        String cacheKey = CACHE_PREFIX + normalizedName;

        // 1. Check Redis cache
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                CompanySummaryDTO dto = objectMapper.readValue(cached, CompanySummaryDTO.class);
                dto.setFromCache(true);
                return dto;
            } catch (Exception ignored) {
                // cache entry is corrupt — fall through to rebuild
            }
        }

        // 2. Fetch reviews from DB
        List<CompanyReview> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getCompanyNameNormalized().equals(normalizedName))
                .collect(Collectors.toList());

        if (reviews.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No reviews found for company: " + companyName);
        }

        // 3. Compute stats
        long totalReviews = reviews.size();
        double avgRating = reviews.stream()
                .mapToInt(CompanyReview::getOverallRating)
                .average()
                .orElse(0);

        // 4. Build AI prompt
        String reviewsContext = reviews.stream()
                .map(r -> String.format("Role: %s | Difficulty: %s | Outcome: %s | Rating: %d/5 | Review: %s",
                        r.getRoleTitle(), r.getDifficulty(), r.getOutcome(),
                        r.getOverallRating(), r.getReviewText()))
                .collect(Collectors.joining("\n---\n"));

        String prompt = String.format("""
                You are analyzing interview experiences at %s submitted by candidates on an interview prep platform.

                Reviews:
                %s

                Based on these reviews, return a JSON object with exactly these fields:
                {
                  "difficultyLevel": "one of: Easy, Moderate, Hard, Very hard",
                  "commonTopics": ["topic1", "topic2", "topic3"],
                  "topTips": ["tip1", "tip2", "tip3"],
                  "overallSentiment": "one sentence summary of the candidate experience"
                }

                Return ONLY valid JSON. No markdown, no explanation, no extra text.
                """, companyName, reviewsContext);

        // 5. Call AI with fallback
        CompanySummaryDTO dto;
        try {
            String aiResponse = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            String cleaned = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode node = objectMapper.readTree(cleaned);

            dto = CompanySummaryDTO.builder()
                    .companyName(companyName)
                    .totalReviews(totalReviews)
                    .averageRating(Math.round(avgRating * 10.0) / 10.0)
                    .difficultyLevel(node.get("difficultyLevel").asText())
                    .commonTopics(objectMapper.convertValue(node.get("commonTopics"),
                            new TypeReference<List<String>>() {}))
                    .topTips(objectMapper.convertValue(node.get("topTips"),
                            new TypeReference<List<String>>() {}))
                    .overallSentiment(node.get("overallSentiment").asText())
                    .fromCache(false)
                    .generatedAt(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            dto = CompanySummaryDTO.builder()
                    .companyName(companyName)
                    .totalReviews(totalReviews)
                    .averageRating(Math.round(avgRating * 10.0) / 10.0)
                    .difficultyLevel("Moderate")
                    .commonTopics(List.of("Technical skills", "Communication", "Problem solving"))
                    .topTips(List.of("Prepare well", "Be confident", "Research the company"))
                    .overallSentiment("AI summary temporarily unavailable — showing computed stats only.")
                    .fromCache(false)
                    .generatedAt(LocalDateTime.now())
                    .build();
        }

        // 6. Cache the result
        try {
            String json = objectMapper.writeValueAsString(dto);
            redisTemplate.opsForValue().set(cacheKey, json, CACHE_TTL_HOURS, TimeUnit.HOURS);
        } catch (Exception ignored) {}

        return dto;
    }

    public void invalidateSummary(String companyNameNormalized) {
        redisTemplate.delete(CACHE_PREFIX + companyNameNormalized);
    }
}
