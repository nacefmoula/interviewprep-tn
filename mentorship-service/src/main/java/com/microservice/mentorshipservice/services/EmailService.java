package com.microservice.mentorshipservice.services;

public interface EmailService {
    void sendHtml(String to, String subject, String html);
}
