package com.microservice.resourceservice.service;

import com.microservice.resourceservice.dto.ResourceResponse;
import com.microservice.resourceservice.exception.ResourceNotFoundException;
import com.microservice.resourceservice.mapper.ResourceMapper;
import com.microservice.resourceservice.model.Resource;
import com.microservice.resourceservice.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Finds resources semantically related to a given resource using simple but robust text similarity
 * over title + description + category + industry, boosted when level/type match.
 * No external AI call; pure in-memory scoring.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiRelatedResourcesService {

    private final ResourceRepository resourceRepository;
    private final ResourceMapper resourceMapper;

    // Bilingual stopword list (FR + EN) — short but practical
    private static final Set<String> STOPWORDS = Set.of(
        "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "for", "to", "with", "by", "from",
        "is", "are", "was", "were", "be", "been", "being", "this", "that", "these", "those", "it", "its",
        "as", "about", "how", "what", "why", "when", "where", "who", "which", "your", "you", "we", "our",
        "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "mais", "dans", "sur", "pour",
        "par", "avec", "sans", "est", "sont", "ce", "cette", "ces", "il", "elle", "ils", "elles",
        "comme", "comment", "que", "qui", "quoi", "votre", "vos", "notre", "nos", "son", "sa", "ses"
    );

    /**
     * Find resources similar to a free-form {title + description} query (pre-creation).
     * Used by the "duplicate detection" warning in the resource-creation form.
     */
    public List<ScoredResource> findSimilarByText(String title, String description, int limit) {
        String blob = ((title == null ? "" : title) + " " + (description == null ? "" : description)).trim();
        Set<String> targetTokens = tokenize(blob);
        if (targetTokens.isEmpty()) {
            return List.of();
        }

        int safeLimit = Math.max(1, Math.min(limit, 10));

        List<Resource> all = resourceRepository.findTopActive(PageRequest.of(0, 300));
        List<Scored> scored = new ArrayList<>();
        for (Resource candidate : all) {
            Set<String> candidateTokens = tokenize(buildSearchBlob(candidate));
            if (candidateTokens.isEmpty()) continue;

            double j = jaccard(targetTokens, candidateTokens);
            double score = j * 100.0;
            // Extra weight when the exact title (trimmed) appears in the candidate
            if (title != null && title.trim().length() >= 4 && candidate.getTitle() != null
                && candidate.getTitle().toLowerCase().contains(title.trim().toLowerCase())) {
                score += 20;
            }
            if (score > 0) scored.add(new Scored(candidate, score));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed());
        return scored.stream()
            .limit(safeLimit)
            .map(s -> new ScoredResource(resourceMapper.toResponse(s.resource()), Math.round(s.score() * 10.0) / 10.0))
            .toList();
    }

    public record ScoredResource(ResourceResponse resource, double similarity) {}

    public List<ResourceResponse> findSimilar(UUID resourceId, int limit) {
        Resource target = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));

        Set<String> targetTokens = tokenize(buildSearchBlob(target));
        if (targetTokens.isEmpty()) {
            return List.of();
        }

        int safeLimit = Math.max(1, Math.min(limit, 20));

        // Score up to 300 most recent resources (bounded scan for performance)
        List<Resource> all = resourceRepository.findTopActive(PageRequest.of(0, 300));
        List<Scored> scored = new ArrayList<>();
        for (Resource candidate : all) {
            if (candidate.getId().equals(resourceId)) continue;
            Set<String> candidateTokens = tokenize(buildSearchBlob(candidate));
            if (candidateTokens.isEmpty()) continue;

            double jaccard = jaccard(targetTokens, candidateTokens);
            double score = jaccard * 100.0;

            // Bonus for matching categorical signals
            if (sameEnum(target.getCategory() == null ? null : target.getCategory().getId(),
                         candidate.getCategory() == null ? null : candidate.getCategory().getId())) {
                score += 12;
            }
            if (target.getIndustry() != null && target.getIndustry() == candidate.getIndustry()) {
                score += 6;
            }
            if (target.getType() != null && target.getType() == candidate.getType()) {
                score += 4;
            }
            if (target.getLevel() != null && target.getLevel() == candidate.getLevel()) {
                score += 3;
            }

            if (score > 0) {
                scored.add(new Scored(candidate, score));
            }
        }

        scored.sort(Comparator.comparingDouble(Scored::score).reversed());
        return scored.stream()
            .limit(safeLimit)
            .map(s -> resourceMapper.toResponse(s.resource()))
            .toList();
    }

    private static String buildSearchBlob(Resource r) {
        StringBuilder sb = new StringBuilder();
        if (r.getTitle() != null) sb.append(r.getTitle()).append(' ');
        if (r.getDescription() != null) sb.append(r.getDescription()).append(' ');
        if (r.getCategory() != null && r.getCategory().getName() != null) {
            sb.append(r.getCategory().getName()).append(' ');
        }
        if (r.getIndustry() != null) sb.append(r.getIndustry().name()).append(' ');
        return sb.toString();
    }

    private static Set<String> tokenize(String text) {
        if (text == null) return Set.of();
        String[] parts = text.toLowerCase()
            .replaceAll("[^\\p{L}\\p{Nd}\\s]", " ")
            .split("\\s+");
        Set<String> tokens = new HashSet<>();
        for (String p : parts) {
            if (p == null || p.isBlank()) continue;
            if (p.length() < 3) continue;              // drop tiny tokens
            if (STOPWORDS.contains(p)) continue;
            tokens.add(p);
        }
        return tokens;
    }

    private static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) return 0.0;
        Set<String> inter = new HashSet<>(a);
        inter.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return (double) inter.size() / (double) union.size();
    }

    private static boolean sameEnum(Object a, Object b) {
        return a != null && a.equals(b);
    }

    private record Scored(Resource resource, double score) {}
}
