package com.microservice.resourceservice.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResourceEngagementResponse {
    private UUID id;
    private UUID resourceId;
    private String resourceTitle;
    private String resourceUrl;
    private String resourceType;
    private String resourceThumbUrl;
    private String resourceCategoryName;
    private String status;
    private short progressPct;
    private int openCount;
    private String notes;
    private OffsetDateTime firstOpenedAt;
    private OffsetDateTime lastOpenedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Set<String> activityDays;
    private int streakDays;
}
