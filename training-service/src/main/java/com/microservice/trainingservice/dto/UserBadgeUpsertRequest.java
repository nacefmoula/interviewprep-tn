package com.microservice.trainingservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadgeUpsertRequest {

    @NotBlank
    private String userId;

    @NotNull
    private Long badgeId;

    @Min(0)
    private Integer progress;
}
