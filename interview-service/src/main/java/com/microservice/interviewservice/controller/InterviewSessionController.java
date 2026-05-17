package com.microservice.interviewservice.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.microservice.interviewservice.dto.request.CreateInterviewSessionRequest;
import com.microservice.interviewservice.dto.request.SubmitResponseRequest;
import com.microservice.interviewservice.dto.request.UpdateInterviewSessionRequest;
import com.microservice.interviewservice.dto.response.InterviewSessionResponse;
import com.microservice.interviewservice.dto.response.SubmitResponseResult;
import com.microservice.interviewservice.model.Question;
import com.microservice.interviewservice.service.InterviewSessionService;
import com.microservice.interviewservice.service.ResponseService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/interview-sessions")
@RequiredArgsConstructor
public class InterviewSessionController {

    private final InterviewSessionService service;
    private final ResponseService         responseService;

    // ── User endpoints ────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<InterviewSessionResponse> create(
            @Valid @RequestBody CreateInterviewSessionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createSession(request, extractUserId(jwt)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InterviewSessionResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.getSession(id, extractUserId(jwt)));
    }

    @GetMapping("/me")
    public ResponseEntity<List<InterviewSessionResponse>> getMySessions(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.getMySessions(extractUserId(jwt)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<InterviewSessionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInterviewSessionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.updateSession(id, request, extractUserId(jwt)));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<InterviewSessionResponse> pause(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.pauseSession(id, extractUserId(jwt)));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<InterviewSessionResponse> resume(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.resumeSession(id, extractUserId(jwt)));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<InterviewSessionResponse> complete(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.completeSession(id, extractUserId(jwt)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<InterviewSessionResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.cancelSession(id, extractUserId(jwt)));
    }

    /** User deletes their own session (any status). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOwn(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        service.deleteSession(id, extractUserId(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/next-question")
    public ResponseEntity<Question> getNextQuestion(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.getNextQuestion(id, extractUserId(jwt)));
    }

    @PostMapping("/{id}/responses")
    public ResponseEntity<SubmitResponseResult> submitResponse(
            @PathVariable Long id,
            @Valid @RequestBody SubmitResponseRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(responseService.submitResponse(id, request, extractUserId(jwt)));
    }

    // ── Admin endpoints ───────────────────────────────────────────────────────

    /** Admin: get all sessions for a specific user. */
    @GetMapping("/admin/by-user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<InterviewSessionResponse>> getSessionsByUser(
            @PathVariable String userId) {
        return ResponseEntity.ok(service.getSessionsByUser(userId));
    }

    /** Admin: hard-delete any session (cascades report + responses). */
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> adminDelete(@PathVariable Long id) {
        service.adminDeleteSession(id);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractUserId(Jwt jwt) {
        return jwt.getSubject();
    }
}