package com.microservice.trainingservice.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadgeResponse {
    private Long id;
    private String userId;
    private Long badgeId;
    private BadgeResponse badge;
    private LocalDateTime earnedDate;
    private Integer progress;
    private LocalDateTime createdAt;
}
