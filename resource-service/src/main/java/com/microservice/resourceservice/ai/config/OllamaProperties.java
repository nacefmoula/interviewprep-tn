package com.microservice.resourceservice.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "ollama")
public class OllamaProperties {

    private String baseUrl = "http://localhost:11434";

    private String model = "llama3.2";

    /**
     * Request timeout for Ollama HTTP calls.
     */
    private int timeoutMs = 20000;
}

