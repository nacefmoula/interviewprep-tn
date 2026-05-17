package com.quizservice.controller;

import com.quizservice.dto.request.SubmitAttemptRequest;
import com.quizservice.dto.response.QuizResultResponse;
import com.quizservice.service.AttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AttemptController {

    private final AttemptService attemptService;

    @PostMapping("/quizzes/{quizId}/start")
    public ResponseEntity<Map<String, Object>> startQuiz(
            @PathVariable UUID quizId,      // ✅ UUID
            Authentication auth) {
        UUID userId = getUserId(auth);      // ✅ UUID
        return ResponseEntity.ok(attemptService.startQuiz(quizId, userId));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<QuizResultResponse> submitAttempt(
            @PathVariable UUID attemptId,   // ✅ UUID
            @Valid @RequestBody SubmitAttemptRequest request,
            Authentication auth) {
        UUID userId = getUserId(auth);
        return ResponseEntity.ok(
                attemptService.submitAttempt(attemptId, request, userId));
    }

    @GetMapping("/attempts/my")
    public ResponseEntity<List<Map<String, Object>>> getMyAttempts(
            Authentication auth) {
        UUID userId = getUserId(auth);
        return ResponseEntity.ok(attemptService.getMyAttempts(userId));
    }

    @GetMapping("/attempts/{attemptId}/result")
    public ResponseEntity<QuizResultResponse> getResult(
            @PathVariable UUID attemptId,
            Authentication auth) {
        UUID userId = getUserId(auth);
        return ResponseEntity.ok(attemptService.getResult(attemptId, userId));
    }

    // ✅ CORRIGÉ — retourne UUID (avant retournait Long mais castait en UUID → crash)
    private UUID getUserId(Authentication auth) {
        Jwt jwt = (Jwt) auth.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }

}