package com.microservice.interviewservice.controller;

import com.microservice.interviewservice.client.GroqClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Quick diagnostic endpoint to verify that the Groq API key and model are working.
 *
 * Usage:
 *   curl -H "Authorization: Bearer <your-jwt>" http://localhost:8082/api/diag/groq
 *
 * Returns:
 *   200 + {"status":"ok","response":"..."} if Groq works
 *   500 + {"status":"error","message":"..."} with the real Groq error if it doesn't
 */
@Slf4j
@RestController
@RequestMapping("/api/diag")
@RequiredArgsConstructor
public class GroqDiagnosticController {

    private final GroqClient anthropicClient;

    @GetMapping("/groq")
    public ResponseEntity<Map<String, Object>> testGroq() {
        try {
            String response = anthropicClient.ask(
                    "Reply with exactly this JSON and nothing else: {\"status\":\"ok\",\"message\":\"Groq is working\"}"
            );
            log.info("Groq diagnostic OK. Response: {}", response);
            return ResponseEntity.ok(Map.of(
                    "status",   "ok",
                    "response", response
            ));
        } catch (Exception e) {
            log.error("Groq diagnostic FAILED: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "status",  "error",
                    "message", e.getMessage()
            ));
        }
    }
}