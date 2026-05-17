package com.microservice.resourceservice.dto;

import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiGenerateResourcesRequest {

    @Min(1)
    @Max(50)
    private Integer count;

    private UUID categoryId;

    private IndustryEnum industry;

    private ResourceLevelEnum level;

    private ResourceTypeEnum type;
}

