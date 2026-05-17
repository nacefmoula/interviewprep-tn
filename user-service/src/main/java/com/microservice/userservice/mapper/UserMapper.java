package com.microservice.userservice.mapper;

import com.microservice.userservice.dto.CreateUserRequest;
import com.microservice.userservice.dto.UpdateUserRequest;
import com.microservice.userservice.dto.UserIdentityResponse;
import com.microservice.userservice.dto.UserResponse;
import com.microservice.userservice.model.User;
import org.mapstruct.*;

@Mapper(componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {

    @Mapping(target = "skills", ignore = true)
    UserResponse toResponse(User user);

    UserIdentityResponse toIdentityResponse(User user);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "keycloakId", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "karmaPoints", ignore = true)
    @Mapping(target = "isVerified", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "plan", ignore = true)
    @Mapping(target = "simulationsUsedThisMonth", ignore = true)
    @Mapping(target = "simulationsLimit", ignore = true)
    @Mapping(target = "subscriptionActive", ignore = true)
    @Mapping(target = "subscriptionStart", ignore = true)
    @Mapping(target = "subscriptionEnd", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "skillsJson", ignore = true)
    @Mapping(target = "cvUrl", ignore = true)
    @Mapping(target = "bio", ignore = true)
    @Mapping(target = "avatarUrl", ignore = true)
    @Mapping(target = "emailNotificationsEnabled", ignore = true)
    @Mapping(target = "pushNotificationsEnabled", ignore = true)
    @Mapping(target = "profileVisible", ignore = true)
    @Mapping(target = "experiencesJson", ignore = true)
    @Mapping(target = "educationsJson", ignore = true)
    @Mapping(target = "passkeyRegistered", ignore = true)
    @Mapping(target = "passkeyRegisteredAt", ignore = true)
    User toEntity(CreateUserRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "keycloakId", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "karmaPoints", ignore = true)
    @Mapping(target = "isVerified", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "plan", ignore = true)
    @Mapping(target = "simulationsUsedThisMonth", ignore = true)
    @Mapping(target = "simulationsLimit", ignore = true)
    @Mapping(target = "subscriptionActive", ignore = true)
    @Mapping(target = "subscriptionStart", ignore = true)
    @Mapping(target = "subscriptionEnd", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "skillsJson", ignore = true)
    @Mapping(target = "cvUrl", ignore = true)
    @Mapping(target = "passkeyRegistered", ignore = true)
    @Mapping(target = "passkeyRegisteredAt", ignore = true)
    void updateEntity(UpdateUserRequest request, @MappingTarget User user);
}
