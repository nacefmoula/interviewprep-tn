package com.microservice.mentorshipservice.DTOs;

import java.util.UUID;

public class RecommendationChatRequest {

    private UUID mentorId;
    private String message;

    public RecommendationChatRequest() {
    }

    public UUID getMentorId() {
        return mentorId;
    }

    public void setMentorId(UUID mentorId) {
        this.mentorId = mentorId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
