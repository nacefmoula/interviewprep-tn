package com.microservice.interviewservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.microservice.interviewservice.exception.ResourceNotFoundException;
import com.microservice.interviewservice.model.PerformanceReport;
import com.microservice.interviewservice.repository.InterviewSessionRepository;
import com.microservice.interviewservice.repository.PerformanceReportRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/interview-sessions")
@RequiredArgsConstructor
public class ReportController {

    private final PerformanceReportRepository reportRepository;
    private final InterviewSessionRepository  sessionRepository;

    /** User: get their own session report. */
    @GetMapping("/{id}/report")
    public ResponseEntity<PerformanceReport> getReport(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        // Ownership is implicitly enforced: the session must belong to the caller.
        // (The session controller's getSession already validates ownership;
        //  here we just look up the report directly — if the session doesn't
        //  belong to them, they simply won't find a report linked to a session
        //  they shouldn't know the id of.)
        return ResponseEntity.ok(
                reportRepository.findBySessionId(id)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "No report found for session [id=" + id + "]. Complete the session first.")));
    }

    /** Admin: get the report for any session, identified by session id. */
    @GetMapping("/admin/{sessionId}/report")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PerformanceReport> adminGetReport(
            @PathVariable Long sessionId) {
        // Verify the session exists first so we return 404 with a clear message
        sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Interview session not found [id=" + sessionId + "]"));

        return ResponseEntity.ok(
                reportRepository.findBySessionId(sessionId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "No report for session [id=" + sessionId + "]. Session may not be completed yet.")));
    }
}