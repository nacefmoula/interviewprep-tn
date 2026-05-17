package com.microservice.mentorshipservice.controllers;

import com.microservice.mentorshipservice.DTOs.MentorScoreDTO;
import com.microservice.mentorshipservice.DTOs.RecommendationChatRequest;
import com.microservice.mentorshipservice.DTOs.RecommendationChatResponse;
import com.microservice.mentorshipservice.services.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    @Autowired
    private RecommendationService service;

    @GetMapping
    public ResponseEntity<List<MentorScoreDTO>> getRecommendations() {
        return ResponseEntity.ok(service.recommend());
    }

    @PostMapping("/chat")
    public ResponseEntity<RecommendationChatResponse> chat(@RequestBody RecommendationChatRequest req) {
        if (req == null || req.getMentorId() == null) {
            return ResponseEntity.badRequest().body(new RecommendationChatResponse("Missing mentorId."));
        }
        String message = req.getMessage();
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(new RecommendationChatResponse("Message cannot be empty."));
        }

        String reply = service.chat(req.getMentorId(), message);
        return ResponseEntity.ok(new RecommendationChatResponse(reply));
    }
}