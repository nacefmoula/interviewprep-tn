// RatingRequestDTO.java
package com.microservice.mentorshipservice.DTOs;
import java.util.UUID;

public class RatingRequestDTO {
    private int stars;      // 1-5
    private String comment;
    private UUID sessionId;

    public int getStars() { return stars; }
    public void setStars(int stars) { this.stars = stars; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
}