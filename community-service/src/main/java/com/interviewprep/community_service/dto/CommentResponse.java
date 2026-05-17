package com.interviewprep.community_service.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CommentResponse {
    private Long id;
    private Long postId;
    private String authorKeycloakId;
    private String content;
    private String parentCommentId;
    private Integer upvotes;
    private Boolean isEdited;
    private Boolean isReported;
    private LocalDateTime createdAt;
}
