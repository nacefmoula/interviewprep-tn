package com.microservice.resourceservice.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ResourceStatsResponse {
    private long totalCount;
    private long videoCount;
    private long articleCount;
    private long podcastCount;
    private long bookCount;
    private long quizCount;
    private long categoryCount;
    private long newThisWeek;
}
