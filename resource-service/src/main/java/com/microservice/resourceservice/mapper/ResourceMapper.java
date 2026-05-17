package com.microservice.resourceservice.mapper;

import com.microservice.resourceservice.dto.ResourceRequest;
import com.microservice.resourceservice.dto.ResourceResponse;
import com.microservice.resourceservice.model.Resource;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ResourceMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "bookmarks", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "viewCount", ignore = true)
    Resource toEntity(ResourceRequest request);

    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    ResourceResponse toResponse(Resource entity);
}
