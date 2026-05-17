package com.quizservice.controller;

import com.quizservice.dto.request.CreateQuizRequest;
import com.quizservice.dto.request.CreateQuestionRequest;
import com.quizservice.dto.response.QuizResponse;
import com.quizservice.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.quizservice.service.ReportService; // Assure-toi que le package est bon

import java.util.UUID;
@RestController
@RequestMapping("/api/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;
    private final ReportService reportService;

    // ── Endpoints publics (token requis) ──────────────────────

    @GetMapping
    public Page<QuizResponse> getPublishedQuizzes(Pageable pageable) {
        return quizService.getPublishedQuizzes(pageable);
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public Page<QuizResponse> getAllQuizzesAdmin(Pageable pageable) {
        return quizService.getAllQuizzesForAdmin(pageable);
    }
    @GetMapping("/module/{moduleId}")
    public Page<QuizResponse> getByModule(
            @PathVariable Long moduleId, // CHANGE String ou UUID par Long ici
            Pageable pageable) {

        // On appelle directement le service avec le Long
        return quizService.getQuizzesByModule(moduleId, pageable);
    }


    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<QuizResponse> updateQuiz(
            @PathVariable UUID id,
            @Valid @RequestBody CreateQuizRequest request, // On réutilise le DTO de création
            Authentication auth) {
        UUID userId = getUserId(auth);
        return ResponseEntity.ok(quizService.updateQuiz(id, request, userId));
    }




    @GetMapping("/{id}")
    public ResponseEntity<QuizResponse> getQuiz(@PathVariable UUID id,
                                                Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_MANAGER"));

        QuizResponse quiz = isAdmin
                ? quizService.getQuizForAdmin(id)
                : quizService.getQuizForStudent(id);

        return ResponseEntity.ok(quiz);
    }

    // ── Endpoints ADMIN / MANAGER ─────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<QuizResponse> createQuiz(
            @Valid @RequestBody CreateQuizRequest request,
            Authentication auth) {
        UUID userId = getUserId(auth);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(quizService.createQuiz(request, userId));
    }

    @PostMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<?> addQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody CreateQuestionRequest request,
            Authentication auth) {
        UUID userId = getUserId(auth);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(quizService.addQuestion(id, request, userId));
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<QuizResponse> publishQuiz(
            @PathVariable UUID id,
            Authentication auth) {
        UUID userId = getUserId(auth);
        return ResponseEntity.ok(quizService.publishQuiz(id, userId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteQuiz(
            @PathVariable UUID id,
            Authentication auth) {
        UUID userId = getUserId(auth);
        quizService.deleteQuiz(id, userId, true);
        return ResponseEntity.noContent().build();
    }

    private UUID getUserId(Authentication auth) {
        Jwt jwt = (Jwt) auth.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }


    // Dans QuizController.java
    @GetMapping("/api/report/{userId}")
    @PreAuthorize("#userId == authentication.subject or hasRole('ADMIN')")
    public ResponseEntity<?> getReport(@PathVariable String userId) {
        return ResponseEntity.ok(reportService.generateReport(userId));
    }
}