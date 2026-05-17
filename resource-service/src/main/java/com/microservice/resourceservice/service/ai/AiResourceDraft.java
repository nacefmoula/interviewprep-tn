package com.microservice.resourceservice.service.ai;

import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;

import java.util.UUID;

public record AiResourceDraft(
    String title,
    String description,
    String url,
    ResourceTypeEnum type,
    ResourceLevelEnum level,
    IndustryEnum industry,
    String thumbUrl,
    UUID categoryId
) { }

