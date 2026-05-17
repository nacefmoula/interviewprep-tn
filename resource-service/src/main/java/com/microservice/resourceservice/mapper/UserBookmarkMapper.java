package com.microservice.resourceservice.mapper;

import com.microservice.resourceservice.dto.UserBookmarkResponse;
import com.microservice.resourceservice.model.UserBookmark;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, uses = ResourceMapper.class)
public interface UserBookmarkMapper {

    @Mapping(source = "resource.id", target = "resourceId")
    UserBookmarkResponse toResponse(UserBookmark entity);
}
