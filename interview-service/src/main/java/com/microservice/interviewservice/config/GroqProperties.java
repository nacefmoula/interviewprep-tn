package com.microservice.interviewservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import jakarta.annotation.PostConstruct;

@ConfigurationProperties(prefix = "groq")
public record GroqProperties(
        String apiKey,
        String model,
        String baseUrl
) {

    @PostConstruct
    public void validate() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                "\n\nGROQ_API_KEY is not set.\n" +
                "Set it before starting the app, for example:\n" +
                "export GROQ_API_KEY=gsk_...\n"
            );
        }
    }

    public String resolvedModel() {
        return (model == null || model.isBlank())
                ? "llama-3.3-70b-versatile"
                : model;
    }

    public String resolvedBaseUrl() {
        return (baseUrl == null || baseUrl.isBlank())
                ? "https://api.groq.com"
                : baseUrl;
    }
}