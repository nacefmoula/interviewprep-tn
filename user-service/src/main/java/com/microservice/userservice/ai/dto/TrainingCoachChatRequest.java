package com.microservice.userservice.ai.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public record TrainingCoachChatRequest(
        @NotBlank String message,
        List<@Valid ChatMessageDto> history) {
}
