package com.microservice.resourceservice.mapper;

import com.microservice.resourceservice.dto.ResourceCategoryRequest;
import com.microservice.resourceservice.dto.ResourceCategoryResponse;
import com.microservice.resourceservice.model.ResourceCategory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ResourceCategoryMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "resources", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ResourceCategory toEntity(ResourceCategoryRequest request);

    ResourceCategoryResponse toResponse(ResourceCategory entity);
}
