package com.microservice.mentorshipservice.DTOs;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class MentorRequestDTO {
    @NotNull(message = "mentorId is required")
    public UUID mentorId;
}
