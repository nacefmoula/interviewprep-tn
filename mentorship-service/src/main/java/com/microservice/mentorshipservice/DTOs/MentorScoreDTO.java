package com.microservice.mentorshipservice.DTOs;

import java.util.UUID;



public class MentorScoreDTO {

    private UUID mentorId;
    private String firstName;
    private String lastName;
    private String email;
    private String bio;
    private String preferredIndustry;
    private java.util.List<String> skills;
    private double score;
    private String aiExplanation;
    private String status;

    public MentorScoreDTO() {}

    public UUID getMentorId() { return mentorId; }
    public void setMentorId(UUID mentorId) { this.mentorId = mentorId; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getPreferredIndustry() { return preferredIndustry; }
    public void setPreferredIndustry(String preferredIndustry) { this.preferredIndustry = preferredIndustry; }

    public java.util.List<String> getSkills() { return skills; }
    public void setSkills(java.util.List<String> skills) { this.skills = skills; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }

    public String getAiExplanation() { return aiExplanation; }
    public void setAiExplanation(String aiExplanation) { this.aiExplanation = aiExplanation; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}