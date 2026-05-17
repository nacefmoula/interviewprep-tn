package com.microservice.trainingservice.dto;

import com.microservice.trainingservice.model.BadgeCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BadgeUpsertRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    private String description;

    @Size(max = 50)
    private String icon;

    @NotNull
    private BadgeCategory category;

    @NotNull
    @Min(0)
    private Integer xpReward;

    private String criteriaJson;

    @NotNull
    private Boolean isActive;
}
