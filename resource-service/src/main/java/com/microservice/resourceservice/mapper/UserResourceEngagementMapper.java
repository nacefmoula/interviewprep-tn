package com.microservice.resourceservice.mapper;

import com.microservice.resourceservice.dto.UserResourceEngagementResponse;
import com.microservice.resourceservice.model.UserResourceEngagement;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class UserResourceEngagementMapper {

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public UserResourceEngagementResponse toResponse(UserResourceEngagement e) {
        return UserResourceEngagementResponse.builder()
            .id(e.getId())
            .resourceId(e.getResource().getId())
            .resourceTitle(e.getResource().getTitle())
            .resourceUrl(e.getResource().getUrl())
            .resourceType(e.getResource().getType() != null ? e.getResource().getType().name() : null)
            .resourceThumbUrl(e.getResource().getThumbUrl())
            .resourceCategoryName(e.getResource().getCategory() != null ? e.getResource().getCategory().getName() : null)
            .status(e.getStatus())
            .progressPct(e.getProgressPct())
            .openCount(e.getOpenCount())
            .notes(e.getNotes())
            .firstOpenedAt(e.getFirstOpenedAt())
            .lastOpenedAt(e.getLastOpenedAt())
            .createdAt(e.getCreatedAt())
            .updatedAt(e.getUpdatedAt())
            .activityDays(e.getActivityDays())
            .streakDays(computeStreak(e))
            .build();
    }

    private int computeStreak(UserResourceEngagement e) {
        if (e.getActivityDays() == null || e.getActivityDays().isEmpty()) return 0;
        List<LocalDate> sorted = e.getActivityDays().stream()
            .map(d -> LocalDate.parse(d, DAY_FMT))
            .sorted(Comparator.reverseOrder())
            .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        LocalDate expected = sorted.get(0).equals(today) ? today : today.minusDays(1);

        int streak = 0;
        for (LocalDate day : sorted) {
            if (day.equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else {
                break;
            }
        }
        return streak;
    }
}
