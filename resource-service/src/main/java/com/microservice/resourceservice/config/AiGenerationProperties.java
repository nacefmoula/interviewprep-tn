package com.microservice.resourceservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "ai.generation")
public class AiGenerationProperties {

    /**
     * Supported values: "stub", "ollama", "openai".
     */
    private String provider = "stub";

    private int defaultCount = 5;

    private boolean fallbackToStub = true;

    private boolean scheduleEnabled = false;

    /**
     * Spring cron expression (seconds first).
     */
    private String cron = "0 0 3 * * *";

    private int batchSize = 5;

    private OpenAi openai = new OpenAi();
    private Groq groq = new Groq();

    @Getter
    @Setter
    public static class OpenAi {
        private String apiKey;
        private String baseUrl = "https://api.openai.com/v1/chat/completions";
        private String model = "gpt-4o-mini";
        private double temperature = 0.7;
        private int timeoutMs = 20000;
    }

    @Getter
    @Setter
    public static class Groq {
        private String apiKey;
        private String baseUrl = "https://api.groq.com/openai/v1/chat/completions";
        private String model = "llama3-8b-8192";
        private double temperature = 0.4;
        private int timeoutMs = 15000;
    }
}
