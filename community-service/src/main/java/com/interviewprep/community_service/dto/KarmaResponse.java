package com.interviewprep.community_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KarmaResponse {
    private String keycloakId;
    private String displayName;
    private Integer totalKarma;
    private Integer postsCount;
    private Integer commentsCount;
    private Integer upvotesReceived;
    private LocalDateTime updatedAt;
}
