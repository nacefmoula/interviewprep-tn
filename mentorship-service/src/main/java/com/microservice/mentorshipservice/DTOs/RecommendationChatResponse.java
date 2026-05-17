package com.microservice.mentorshipservice.DTOs;

public class RecommendationChatResponse {

    private String reply;

    public RecommendationChatResponse() {}

    public RecommendationChatResponse(String reply) {
        this.reply = reply;}

    public String getReply() {
        return reply;}
        
    public void setReply(String reply) {
        this.reply = reply;
    }
}
