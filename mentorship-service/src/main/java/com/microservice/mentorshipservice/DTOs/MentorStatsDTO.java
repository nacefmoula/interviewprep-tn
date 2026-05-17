// MentorStatsDTO.java
package com.microservice.mentorshipservice.DTOs;

public class MentorStatsDTO {
    private long completedSessions;
    private double averageRating;
    private long totalRatings;

    public MentorStatsDTO(long completedSessions, double averageRating, long totalRatings) {
        this.completedSessions = completedSessions;
        this.averageRating = averageRating;
        this.totalRatings = totalRatings;
    }

    public long getCompletedSessions() { return completedSessions; }
    public double getAverageRating() { return averageRating; }
    public long getTotalRatings() { return totalRatings; }
}