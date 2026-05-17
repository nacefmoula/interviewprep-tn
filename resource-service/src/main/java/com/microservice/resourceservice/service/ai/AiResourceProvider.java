package com.microservice.resourceservice.service.ai;

import com.microservice.resourceservice.enums.IndustryEnum;
import com.microservice.resourceservice.enums.ResourceLevelEnum;
import com.microservice.resourceservice.enums.ResourceTypeEnum;
import com.microservice.resourceservice.model.ResourceCategory;

import java.util.List;

public interface AiResourceProvider {

    List<AiResourceDraft> generate(
        ResourceCategory category,
        int count,
        IndustryEnum industry,
        ResourceLevelEnum level,
        ResourceTypeEnum type
    );
}

