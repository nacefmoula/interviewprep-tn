package com.microservice.mentorshipservice.DTOs;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;
@Getter
@Setter
public class MentorRequestResponseDTO {
    public UUID id;
    public UUID mentorId;
    public UUID menteeId;
    public String status;
    private LocalDateTime createdAt;


}