package com.microservice.resourceservice.service;

import com.microservice.resourceservice.dto.UserResourceEngagementRequest;
import com.microservice.resourceservice.dto.UserResourceEngagementResponse;
import com.microservice.resourceservice.exception.ResourceNotFoundException;
import com.microservice.resourceservice.mapper.UserResourceEngagementMapper;
import com.microservice.resourceservice.model.Resource;
import com.microservice.resourceservice.model.UserResourceEngagement;
import com.microservice.resourceservice.repository.ResourceRepository;
import com.microservice.resourceservice.repository.UserResourceEngagementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserResourceEngagementService {

    private final UserResourceEngagementRepository engagementRepository;
    private final ResourceRepository resourceRepository;
    private final UserResourceEngagementMapper engagementMapper;

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Transactional(readOnly = true)
    public List<UserResourceEngagementResponse> getEngagementsForUser(UUID userId) {
        return engagementRepository.findByUserId(userId)
            .stream()
            .map(engagementMapper::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public UserResourceEngagementResponse getEngagement(UUID userId, UUID resourceId) {
        return engagementRepository.findByUserIdAndResource_Id(userId, resourceId)
            .map(engagementMapper::toResponse)
            .orElseThrow(() -> new ResourceNotFoundException("No engagement found for resource: " + resourceId));
    }

    @Transactional
    public UserResourceEngagementResponse recordOpen(UUID userId, UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));

        UserResourceEngagement engagement = engagementRepository
            .findByUserIdAndResource_Id(userId, resourceId)
            .orElseGet(() -> UserResourceEngagement.builder()
                .userId(userId)
                .resource(resource)
                .build());

        OffsetDateTime now = OffsetDateTime.now();
        if (engagement.getFirstOpenedAt() == null) {
            engagement.setFirstOpenedAt(now);
        }
        engagement.setLastOpenedAt(now);
        engagement.setOpenCount(engagement.getOpenCount() + 1);

        if ("NOT_STARTED".equals(engagement.getStatus())) {
            engagement.setStatus("IN_PROGRESS");
        }

        engagement.getActivityDays().add(LocalDate.now().format(DAY_FMT));

        return engagementMapper.toResponse(engagementRepository.save(engagement));
    }

    @Transactional
    public UserResourceEngagementResponse updateEngagement(UUID userId, UUID resourceId,
                                                           UserResourceEngagementRequest request) {
        UserResourceEngagement engagement = engagementRepository
            .findByUserIdAndResource_Id(userId, resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("No engagement found for resource: " + resourceId));

        if (request.getStatus() != null) {
            validateStatus(request.getStatus());
            engagement.setStatus(request.getStatus());
            if ("COMPLETED".equals(request.getStatus()) && engagement.getProgressPct() < 100) {
                engagement.setProgressPct((short) 100);
            }
        }
        if (request.getProgressPct() != null) {
            engagement.setProgressPct(request.getProgressPct());
            if (request.getProgressPct() == 100 && !"COMPLETED".equals(engagement.getStatus())) {
                engagement.setStatus("COMPLETED");
            } else if (request.getProgressPct() > 0 && "NOT_STARTED".equals(engagement.getStatus())) {
                engagement.setStatus("IN_PROGRESS");
            }
        }
        if (request.getNotes() != null) {
            engagement.setNotes(request.getNotes().isBlank() ? null : request.getNotes());
        }

        return engagementMapper.toResponse(engagementRepository.save(engagement));
    }

    @Transactional
    public UserResourceEngagementResponse ensureEngagement(UUID userId, UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));

        return engagementRepository.findByUserIdAndResource_Id(userId, resourceId)
            .map(engagementMapper::toResponse)
            .orElseGet(() -> {
                UserResourceEngagement e = UserResourceEngagement.builder()
                    .userId(userId)
                    .resource(resource)
                    .build();
                return engagementMapper.toResponse(engagementRepository.save(e));
            });
    }

    private void validateStatus(String status) {
        if (!List.of("NOT_STARTED", "IN_PROGRESS", "COMPLETED").contains(status)) {
            throw new IllegalArgumentException("Invalid engagement status: " + status);
        }
    }
}
