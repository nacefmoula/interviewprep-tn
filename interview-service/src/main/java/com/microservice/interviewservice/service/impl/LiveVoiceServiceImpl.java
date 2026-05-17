package com.microservice.interviewservice.service.impl;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.interviewservice.dto.live.LiveVoiceSpeakRequest;
import com.microservice.interviewservice.dto.live.VoiceSynthesisResult;
import com.microservice.interviewservice.exception.BusinessException;
import com.microservice.interviewservice.service.LiveVoiceService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class LiveVoiceServiceImpl implements LiveVoiceService {

    private final RestClient kokoroClient;
    private final RestClient piperClient;
    private final String kokoroBaseUrl;
    private final String piperBaseUrl;
    private final ObjectMapper objectMapper;

    // Cache the live-probe result so /available stays cheap.
    private volatile boolean cachedAvailable = false;
    private volatile Instant cacheExpiry = Instant.EPOCH;
    private static final Duration CACHE_TTL = Duration.ofSeconds(30);

    public LiveVoiceServiceImpl(
            @Value("${app.tts.kokoro-base-url:http://127.0.0.1:8880}") String kokoroBaseUrl,
            @Value("${app.tts.piper-base-url:}") String piperBaseUrl,
            ObjectMapper objectMapper) {

        this.kokoroBaseUrl = sanitize(kokoroBaseUrl);
        this.piperBaseUrl = sanitize(piperBaseUrl);
        this.objectMapper = objectMapper;

        log.info("TTS config -> kokoro='{}', piper='{}'", this.kokoroBaseUrl, this.piperBaseUrl);

        // Use the JDK's built-in HttpClient forced to HTTP/1.1 to avoid
        // sending "Upgrade" headers, which Kokoro-FastAPI's Uvicorn rejects
        // with "Invalid HTTP request received." and returns 422.
        HttpClient jdkHttpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(jdkHttpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(30));

        this.kokoroClient = this.kokoroBaseUrl.isBlank()
                ? null
                : RestClient.builder()
                        .baseUrl(this.kokoroBaseUrl)
                        .requestFactory(requestFactory)
                        .build();
        this.piperClient = this.piperBaseUrl.isBlank()
                ? null
                : RestClient.builder()
                        .baseUrl(this.piperBaseUrl)
                        .requestFactory(requestFactory)
                        .build();
    }

    @Override
    public boolean isAvailable() {
        if (kokoroClient == null && piperClient == null) {
            return false;
        }

        if (Instant.now().isBefore(cacheExpiry)) {
            return cachedAvailable;
        }

        boolean available = false;

        if (kokoroClient != null && probeKokoro()) {
            available = true;
        } else if (piperClient != null && probePiper()) {
            available = true;
        }

        cachedAvailable = available;
        cacheExpiry = Instant.now().plus(CACHE_TTL);
        log.debug("TTS availability probe -> {} (kokoro='{}', piper='{}')",
                available, kokoroBaseUrl, piperBaseUrl);
        return available;
    }

    private boolean probeKokoro() {
        try {
            kokoroClient.get()
                    .uri("/v1/voices")
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        throw new BusinessException("Kokoro probe HTTP " + resp.getStatusCode());
                    })
                    .toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.debug("Kokoro probe failed at {}: {}", kokoroBaseUrl, ex.getMessage());
            return false;
        }
    }

    private boolean probePiper() {
        try {
            piperClient.get().uri("/").retrieve().toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.debug("Piper probe failed at {}: {}", piperBaseUrl, ex.getMessage());
            return false;
        }
    }

    @Override
    public VoiceSynthesisResult speak(LiveVoiceSpeakRequest request) {
        String text = request.text() == null ? "" : request.text().trim();
        if (text.isBlank()) {
            throw new BusinessException("Text is required for speech synthesis.");
        }

        if (!isAvailable()) {
            throw new BusinessException(
                    "TTS service is currently unavailable. Client should fall back to browser TTS.");
        }

        Exception kokoroError = null;

        if (kokoroClient != null) {
            try {
                return speakWithKokoro(text, request);
            } catch (Exception ex) {
                kokoroError = ex;
                log.warn("Kokoro TTS failed. Falling back to Piper. Reason: {}", ex.getMessage());
                cacheExpiry = Instant.EPOCH;
            }
        }

        if (piperClient != null) {
            try {
                return speakWithPiper(text, request);
            } catch (Exception ex) {
                cacheExpiry = Instant.EPOCH;
                String kokoroMsg = kokoroError == null ? "not attempted" : kokoroError.getMessage();
                throw new BusinessException(
                        "Kokoro and Piper both failed. Kokoro: " + kokoroMsg + " | Piper: " + ex.getMessage());
            }
        }

        throw new BusinessException(kokoroError != null
                ? "TTS synthesis failed. Kokoro: " + kokoroError.getMessage() + ". Piper is not configured."
                : "No TTS backend is configured. Set app.tts.kokoro-base-url and/or app.tts.piper-base-url.");
    }

    private VoiceSynthesisResult speakWithKokoro(String text, LiveVoiceSpeakRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", "tts-1");
        payload.put("input", text);
        payload.put("voice", toKokoroVoice(request.voice()));
        payload.put("response_format", "wav");
        payload.put("speed", 0.95);

        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("Failed to serialize Kokoro payload: " + ex.getMessage());
        }

        log.info("Using Kokoro for text='{}' voice='{}' (body={} bytes)",
                text, toKokoroVoice(request.voice()), jsonBody.length());
        log.debug("Kokoro request JSON: {}", jsonBody);

        try {
            byte[] audio = kokoroClient.post()
                    .uri("/v1/audio/speech")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_OCTET_STREAM, MediaType.valueOf("audio/wav"))
                    .body(jsonBody)
                    .retrieve()
                    .body(byte[].class);

            if (audio == null || audio.length == 0) {
                throw new BusinessException("Kokoro returned empty audio.");
            }
            return new VoiceSynthesisResult(audio, "audio/wav");
        } catch (RestClientResponseException ex) {
            log.error("Kokoro HTTP error. status={} body={}", ex.getStatusCode(), ex.getResponseBodyAsString(), ex);
            throw new BusinessException("Kokoro HTTP error: " + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Kokoro synthesis failed. baseUrl={} text='{}' voice='{}'",
                    this.kokoroBaseUrl, text, toKokoroVoice(request.voice()), ex);
            throw new BusinessException("Kokoro synthesis failed: " + ex.getMessage());
        }
    }

    private VoiceSynthesisResult speakWithPiper(String text, LiveVoiceSpeakRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("text", text);
        payload.put("voice", toPiperVoice(request.voice()));

        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("Failed to serialize Piper payload: " + ex.getMessage());
        }

        try {
            byte[] audio = piperClient.post()
                    .uri("/")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_OCTET_STREAM, MediaType.valueOf("audio/wav"))
                    .body(jsonBody)
                    .retrieve()
                    .body(byte[].class);

            if (audio == null || audio.length == 0) {
                throw new BusinessException("Piper returned empty audio.");
            }

            return new VoiceSynthesisResult(audio, "audio/wav");
        } catch (RestClientResponseException ex) {
            throw new BusinessException("Piper HTTP error: " + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            throw new BusinessException("Piper synthesis failed: " + ex.getMessage());
        }
    }

    private String toKokoroVoice(String requestedVoice) {
        String v = normalize(requestedVoice);
        if (v.isBlank() || "recruiter_en".equals(v) || "default".equals(v)) {
            // Your kokoro-server-patched build exposes: af_heart, af_bella, af_nova.
            // af_heart is the recommended default (per the server's own description).
            return "af_heart";
        }
        return requestedVoice;
    }

    private String toPiperVoice(String requestedVoice) {
        String v = normalize(requestedVoice);
        if (v.isBlank() || "recruiter_en".equals(v) || "default".equals(v)) {
            return "en_US-lessac-medium";
        }
        return requestedVoice;
    }

    private String sanitize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}