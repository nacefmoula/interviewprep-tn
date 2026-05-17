package com.interviewprep.community_service.controller;

import com.interviewprep.community_service.dto.CompanyReviewRequestDTO;
import com.interviewprep.community_service.dto.CompanyReviewResponseDTO;
import com.interviewprep.community_service.dto.CompanySummaryDTO;
import com.interviewprep.community_service.service.CompanyReviewService;
import com.interviewprep.community_service.service.CompanySummaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community/company-reviews")
@RequiredArgsConstructor
public class CompanyReviewController {

    private final CompanyReviewService service;
    private final CompanySummaryService summaryService;

    @PostMapping
    public ResponseEntity<CompanyReviewResponseDTO> createReview(
            @Valid @RequestBody CompanyReviewRequestDTO dto,
            @AuthenticationPrincipal Jwt jwt) {
        String authorKeycloakId = jwt.getSubject();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createReview(dto, authorKeycloakId));
    }

    @GetMapping("/company/{companyName}")
    public ResponseEntity<Page<CompanyReviewResponseDTO>> getReviewsByCompany(
            @PathVariable String companyName,
            Pageable pageable) {
        return ResponseEntity.ok(service.getReviewsByCompany(companyName, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompanyReviewResponseDTO> getReviewById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getReviewById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompanyReviewResponseDTO> updateReview(
            @PathVariable Long id,
            @Valid @RequestBody CompanyReviewRequestDTO dto,
            @AuthenticationPrincipal Jwt jwt) {
        String authorKeycloakId = jwt.getSubject();
        return ResponseEntity.ok(service.updateReview(id, dto, authorKeycloakId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String authorKeycloakId = jwt.getSubject();
        service.deleteReview(id, authorKeycloakId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    public ResponseEntity<List<CompanyReviewResponseDTO>> getMyReviews(
            @AuthenticationPrincipal Jwt jwt) {
        String authorKeycloakId = jwt.getSubject();
        return ResponseEntity.ok(service.getMyReviews(authorKeycloakId));
    }

    @GetMapping("/companies/search")
    public ResponseEntity<List<String>> searchCompanies(@RequestParam String q) {
        return ResponseEntity.ok(service.searchCompanies(q));
    }

    @GetMapping("/companies/{companyName}/summary")
    public ResponseEntity<CompanySummaryDTO> getCompanySummary(
            @PathVariable String companyName) {
        return ResponseEntity.ok(summaryService.getSummary(companyName));
    }
}
