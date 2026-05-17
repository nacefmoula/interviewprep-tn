package com.microservice.trainingservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AwardBadgeRequest {
    private String userId;
    private Long badgeId;
    private Integer progress;
}
