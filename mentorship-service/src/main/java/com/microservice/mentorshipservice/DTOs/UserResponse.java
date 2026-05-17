package com.microservice.mentorshipservice.DTOs;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Setter
@Getter
public class UserResponse {
    // Getters and setters
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String bio;
    private List<String> skills;
    private String role;
    private String status;
    private String preferredIndustry;
    private Boolean isVerified;

}