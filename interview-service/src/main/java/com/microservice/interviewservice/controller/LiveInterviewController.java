package com.microservice.interviewservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.microservice.interviewservice.dto.live.CommitTurnRequest;
import com.microservice.interviewservice.dto.live.LiveActionResponse;
import com.microservice.interviewservice.dto.live.LiveStartResponse;
import com.microservice.interviewservice.dto.live.LiveStatusResponse;
import com.microservice.interviewservice.model.PerformanceReport;
import com.microservice.interviewservice.service.LiveInterviewService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/live-interviews")
@RequiredArgsConstructor
public class LiveInterviewController {

    private final LiveInterviewService liveInterviewService;

    @PostMapping("/{sessionId}/start")
    public ResponseEntity<LiveStartResponse> start(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(
                liveInterviewService.start(sessionId, jwt.getSubject())
        );
    }

    /**
     * GET /api/live-interviews/{sessionId}/status
     *
     * Returns the current phase of the live session (ACTIVE / FINISHED / CANCELLED)
     * along with the current question if one is pending.
     *
     * The frontend polls this after receiving the start response to verify the
     * session is truly ACTIVE before enabling the recording UI.
     */
    @GetMapping("/{sessionId}/status")
    public ResponseEntity<LiveStatusResponse> status(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(
                liveInterviewService.getStatus(sessionId, jwt.getSubject())
        );
    }

    @PostMapping("/{sessionId}/commit-turn")
    public ResponseEntity<LiveActionResponse> commitTurn(
            @PathVariable Long sessionId,
            @Valid @RequestBody CommitTurnRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(
                liveInterviewService.commitTurn(sessionId, request, jwt.getSubject())
        );
    }

    @PostMapping("/{sessionId}/end")
    public ResponseEntity<PerformanceReport> end(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Jwt jwt) {

        return ResponseEntity.ok(
                liveInterviewService.end(sessionId, jwt.getSubject())
        );
    }
}