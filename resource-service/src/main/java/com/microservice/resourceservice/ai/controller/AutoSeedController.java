package com.microservice.resourceservice.ai.controller;

import com.microservice.resourceservice.ai.service.AutoSeedService;
import com.microservice.resourceservice.ai.service.OllamaClient;
import com.microservice.resourceservice.security.ResourceAccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/resources/ai")
@RequiredArgsConstructor
public class AutoSeedController {

    private final AutoSeedService autoSeedService;
    private final OllamaClient ollamaClient;
    private final ResourceAccessControlService accessControlService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean available = ollamaClient.isAvailable();
        AutoSeedService.SeedSummary last = autoSeedService.getLastSummary();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ollamaAvailable", available);
        payload.put("lastSeededAt", last != null ? last.seededAt() : null);
        payload.put("provider", last != null ? last.provider() : null);
        payload.put("serverTime", LocalDateTime.now());
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/ollama/summary")
    public ResponseEntity<Map<String, Object>> ollamaSummary() {
        AutoSeedService.SeedSummary last = autoSeedService.getLastSummary();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", last != null ? last.provider() : "ollama");
        payload.put("last", last);
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/static/summary")
    public ResponseEntity<Map<String, Object>> staticSummary() {
        AutoSeedService.SeedSummary last = autoSeedService.getLastSummary();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", last != null ? last.provider() : "static");
        payload.put("last", last);
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/seed")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AutoSeedService.SeedSummary> seed(
        @RequestParam(defaultValue = "false") boolean forceReseed,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(autoSeedService.seedAuto(forceReseed));
    }

    @PostMapping("/seed/static")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AutoSeedService.SeedSummary> seedStatic(
        @RequestParam(defaultValue = "false") boolean forceReseed,
        @AuthenticationPrincipal Jwt jwt
    ) {
        accessControlService.assertCanAdminResources(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(autoSeedService.seedStatic(forceReseed));
    }
}
