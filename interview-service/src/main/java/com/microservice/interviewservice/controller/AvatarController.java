package com.microservice.interviewservice.controller;

import com.microservice.interviewservice.dto.request.AvatarTalkRequest;
import com.microservice.interviewservice.dto.response.AvatarTalkResponse;
import com.microservice.interviewservice.service.AvatarService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/avatar")
public class AvatarController {

    private final AvatarService avatarService;

    public AvatarController(AvatarService avatarService) {
        this.avatarService = avatarService;
    }

    @PostMapping("/talk")
    public ResponseEntity<AvatarTalkResponse> createTalk(@Valid @RequestBody AvatarTalkRequest request) {
        AvatarTalkResponse response = avatarService.createTalk(request.getText());
        return ResponseEntity.ok(response);
    }
}