package com.interviewprep.community_service.controller;

import com.interviewprep.community_service.dto.*;
import com.interviewprep.community_service.model.JobCatalog;
import com.interviewprep.community_service.repository.JobCatalogRepository;
import com.interviewprep.community_service.service.CareerService;
import com.interviewprep.community_service.service.ExternalJobFetcherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/community/career")
@RequiredArgsConstructor
public class CareerWizardController {

    private final CareerService careerService;
    private final ExternalJobFetcherService externalJobFetcherService;
    private final JobCatalogRepository jobCatalogRepository;

    @PostMapping("/wizard/save")
    public ResponseEntity<Map<String, Object>> saveWizardProgress(
            @Valid @RequestBody CareerWizardRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = careerService.saveOrUpdateWizard(jwt.getSubject(), request);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", result
        ));
    }

    @PostMapping("/wizard/complete")
    public ResponseEntity<Map<String, Object>> completeWizard(
            @Valid @RequestBody CareerWizardRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var result = careerService.completeWizard(jwt.getSubject(), request);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", result
        ));
    }

    @GetMapping("/wizard/progress")
    public ResponseEntity<Map<String, Object>> getWizardProgress(
            @AuthenticationPrincipal Jwt jwt) {
        var result = careerService.getWizardProgress(jwt.getSubject());
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", result.orElse(null)
        ));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<Map<String, Object>> getRecommendations(
            @AuthenticationPrincipal Jwt jwt) {
        var result = careerService.getRecommendations(jwt.getSubject());
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", result
        ));
    }

    @PostMapping("/jobs/submit")
    public ResponseEntity<Map<String, Object>> submitJob(
            @RequestBody JobSubmission submission,
            @AuthenticationPrincipal Jwt jwt) {
        var result = careerService.submitJob(jwt.getSubject(), submission);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "success", true,
            "data", result
        ));
    }

    @PostMapping("/jobs/fetch")
    public ResponseEntity<Map<String, Object>> fetchJobs() {
        int count = externalJobFetcherService.fetchNow();
        return ResponseEntity.ok(Map.of("message", "Fetched " + count + " new jobs"));
    }

    @GetMapping("/jobs")
    public ResponseEntity<Page<JobCatalog>> listJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String workType,
            @RequestParam(required = false) String keyword) {
        Page<JobCatalog> result = jobCatalogRepository.findWithFilters(
                industry, workType, keyword, PageRequest.of(page, size));
        return ResponseEntity.ok(result);
    }
}
