package com.interviewprep.community_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String keycloakId;
    private String displayName;
    private Integer totalKarma;
    private Integer postsCount;
    private Integer commentsCount;
    private Integer upvotesReceived;
    private Long followersCount;
    private Long followingCount;
    private List<PostResponse> recentPosts;
}
