package com.interviewprep.community_service.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FollowResponse {
    private String followerKeycloakId;
    private String followingKeycloakId;
    private LocalDateTime followedAt;
}
