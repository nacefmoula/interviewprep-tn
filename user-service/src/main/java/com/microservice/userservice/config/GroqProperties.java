package com.microservice.userservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

/**
 * Groq cloud LLM credentials + tuning. Used by {@code CvAiParsingService}
 * to extract structured fields from raw CV text via Groq's OpenAI-compatible
 * /chat/completions endpoint.
 *
 * @see com.microservice.userservice.service.CvAiParsingService
 */
@Component
@ConfigurationProperties(prefix = "groq")
@Getter
@Setter
public class GroqProperties {
    private String apiKey;
    private String baseUrl = "https://api.groq.com";
    private String model = "llama-3.3-70b-versatile";
    private int timeoutSeconds = 60;
    private int maxTokens = 1024;
    private double temperature = 0.1;
}
