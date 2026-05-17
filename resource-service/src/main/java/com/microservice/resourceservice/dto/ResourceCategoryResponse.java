package com.microservice.resourceservice.dto;

import com.microservice.resourceservice.enums.IndustryEnum;
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
public class ResourceCategoryResponse {

    private UUID id;
    private String name;
    private String description;
    private IndustryEnum industry;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
