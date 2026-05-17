package com.interviewprep.community_service.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PostResponse {
    private Long id;
    private String authorKeycloakId;
    private String title;
    private String content;
    private String type;
    private String industry;
    private String tags;
    private Integer upvotes;
    private Integer downvotes;
    private Integer viewCount;
    private Boolean isPinned;
    private Boolean isReported;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int score;
    private Integer authorKarma;
}
