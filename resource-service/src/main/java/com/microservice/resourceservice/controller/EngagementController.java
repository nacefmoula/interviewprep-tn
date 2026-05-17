package com.microservice.resourceservice.controller;

import com.microservice.resourceservice.dto.UserResourceEngagementRequest;
import com.microservice.resourceservice.dto.UserResourceEngagementResponse;
import com.microservice.resourceservice.service.UserResourceEngagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/resources/engagements")
@RequiredArgsConstructor
@Tag(name = "Engagement", description = "Per-user resource engagement — opens, progress, notes, streaks")
public class EngagementController {

    private final UserResourceEngagementService engagementService;

    @GetMapping
    public ResponseEntity<List<UserResourceEngagementResponse>> getMyEngagements(
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(engagementService.getEngagementsForUser(resolveUserId(jwt)));
    }

    @GetMapping("/{resourceId}")
    public ResponseEntity<UserResourceEngagementResponse> getEngagement(
        @PathVariable UUID resourceId,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(engagementService.getEngagement(resolveUserId(jwt), resourceId));
    }

    @PostMapping("/{resourceId}/open")
    public ResponseEntity<UserResourceEngagementResponse> recordOpen(
        @PathVariable UUID resourceId,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(engagementService.recordOpen(resolveUserId(jwt), resourceId));
    }

    @PostMapping("/{resourceId}/ensure")
    public ResponseEntity<UserResourceEngagementResponse> ensureEngagement(
        @PathVariable UUID resourceId,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(engagementService.ensureEngagement(resolveUserId(jwt), resourceId));
    }

    @PutMapping("/{resourceId}")
    public ResponseEntity<UserResourceEngagementResponse> updateEngagement(
        @PathVariable UUID resourceId,
        @Valid @RequestBody UserResourceEngagementRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(engagementService.updateEngagement(resolveUserId(jwt), resourceId, request));
    }

    private static UUID resolveUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new org.springframework.web.server.ResponseStatusException(BAD_REQUEST, "Missing JWT subject");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException e) {
            // Non-standard Keycloak subject — derive a stable v3 UUID from the raw string
            return UUID.nameUUIDFromBytes(jwt.getSubject().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
    }
}
