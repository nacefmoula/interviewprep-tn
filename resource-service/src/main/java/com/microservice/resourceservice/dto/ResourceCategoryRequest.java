package com.microservice.resourceservice.dto;

import com.microservice.resourceservice.enums.IndustryEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceCategoryRequest {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    private IndustryEnum industry;
}
