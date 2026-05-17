package com.microservice.resourceservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBookmarkResponse {

    private UUID id;
    private UUID userId;
    private UUID resourceId;
    private ResourceResponse resource;
    private LocalDateTime createdAt;
}
