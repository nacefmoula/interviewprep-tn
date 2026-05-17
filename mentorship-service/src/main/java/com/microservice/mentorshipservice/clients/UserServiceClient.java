package com.microservice.mentorshipservice.clients;

import com.microservice.mentorshipservice.DTOs.UserPageResponse;
import com.microservice.mentorshipservice.DTOs.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(
        name = "user-service",
        url = "${services.user-service.base-url:http://user-service:8081}",
        configuration = UserServiceClientConfig.class)
public interface UserServiceClient {

    @GetMapping("/api/users/me")
    UserResponse getCurrentUser();

    @GetMapping("/api/users/{id}")
    UserResponse getUserById(@PathVariable UUID id);

    @GetMapping("/api/users/by-keycloak/{keycloakId}")
    UserResponse getUserByKeycloakId(@PathVariable String keycloakId);

    @GetMapping("/api/users/by-role")
    UserPageResponse getMentorPage(
    @RequestParam String role,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "50") int size
);
 
}