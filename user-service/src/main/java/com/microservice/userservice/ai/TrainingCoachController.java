package com.microservice.userservice.ai;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.microservice.userservice.ai.dto.TrainingCoachChatRequest;
import com.microservice.userservice.ai.dto.TrainingCoachChatResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ai/training-coach")
public class TrainingCoachController {

    private final TrainingCoachAiService trainingCoachAiService;

    public TrainingCoachController(TrainingCoachAiService trainingCoachAiService) {
        this.trainingCoachAiService = trainingCoachAiService;
    }

    @PostMapping("/chat")
    public ResponseEntity<TrainingCoachChatResponse> chat(
            @Valid @RequestBody TrainingCoachChatRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(trainingCoachAiService.chat(request, jwt));
    }
}
