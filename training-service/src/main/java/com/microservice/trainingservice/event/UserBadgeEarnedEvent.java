package com.microservice.trainingservice.event;

import com.microservice.trainingservice.model.BadgeCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBadgeEarnedEvent {
    private String userId;
    private Long badgeId;
    private String badgeName;
    private BadgeCategory category;
    private Integer xpReward;
    private LocalDateTime earnedAt;
}
