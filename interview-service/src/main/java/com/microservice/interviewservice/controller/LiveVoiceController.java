package com.microservice.interviewservice.controller;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.microservice.interviewservice.dto.live.LiveVoiceSpeakRequest;
import com.microservice.interviewservice.dto.live.VoiceSynthesisResult;
import com.microservice.interviewservice.service.LiveVoiceService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/live-voice")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class LiveVoiceController {

    private final LiveVoiceService liveVoiceService;

    @GetMapping("/available")
    public ResponseEntity<Map<String, Boolean>> available() {
        return ResponseEntity.ok(Map.of("available", liveVoiceService.isAvailable()));
    }

    @PostMapping("/speak")
    public ResponseEntity<byte[]> speak(@RequestBody LiveVoiceSpeakRequest request) {
        VoiceSynthesisResult result = liveVoiceService.speak(request);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, result.contentType())
                .body(result.audio());
    }
}