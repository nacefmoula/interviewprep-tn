package com.microservice.interviewservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.microservice.interviewservice.model.ProgressTracker;
import com.microservice.interviewservice.service.ProgressTrackerService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressTrackerService progressTrackerService;

    /** Current user: get own progress tracker. */
    @GetMapping("/me")
    public ResponseEntity<ProgressTracker> getMyProgress(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                progressTrackerService.getProgressForUser(jwt.getSubject()));
    }

    /** Admin: get progress tracker for any user by their Keycloak user-id. */
    @GetMapping("/admin/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProgressTracker> getProgressForUser(
            @PathVariable String userId) {
        return ResponseEntity.ok(
                progressTrackerService.getProgressForUser(userId));
    }
}