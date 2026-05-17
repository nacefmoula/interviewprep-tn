package com.quizservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.netty.channel.ChannelOption;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Slf4j
@Configuration
public class GroqConfig {

    @Value("${groq.api-key}")
    private String apiKey;

    /** Connect timeout for all outbound HTTP (ms). */
    @Value("${http.client.connect-timeout-ms:5000}")
    private int connectTimeoutMs;

    /** Response timeout for LLM/audio calls — generous, generation can be slow (ms). */
    @Value("${http.client.groq-response-timeout-ms:60000}")
    private int groqResponseTimeoutMs;

    /** Read timeout for the shared RestTemplate (report GET, Kokoro TTS POST) (ms). */
    @Value("${http.client.rest-read-timeout-ms:30000}")
    private int restReadTimeoutMs;

    // Groq utilise l'API compatible OpenAI Chat Completions
    private static final String BASE_URL = "https://api.groq.com/openai/v1";

    @Bean
    public WebClient groqWebClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                .responseTimeout(Duration.ofMillis(groqResponseTimeoutMs));
        return WebClient.builder()
                .baseUrl(BASE_URL)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @PostConstruct
    public void checkConfig() {
        if (apiKey == null || apiKey.isBlank() || apiKey.startsWith("${")) {
            log.error("❌ [GroqConfig] GROQ_API_KEY non définie !");
        } else {
            log.info("✅ [GroqConfig] Groq prêt — clé: {}...", apiKey.substring(0, Math.min(10, apiKey.length())));
        }
    }

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(restReadTimeoutMs);
        return new RestTemplate(factory);
    }

}
