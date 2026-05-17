package com.microservice.interviewservice.service.impl;

import com.microservice.interviewservice.dto.response.AvatarTalkResponse;
import com.microservice.interviewservice.service.AvatarService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.simli.enabled", havingValue = "true")
public class SimliAvatarServiceImpl implements AvatarService {

    @Value("${app.simli.enabled:false}")
    private boolean enabled;

    @Value("${app.simli.api-url:https://api.simli.ai}")
    private String apiUrl;

    @Value("${app.simli.api-key:}")
    private String apiKey;

    @Value("${app.simli.face-id:}")
    private String faceId;

    @Value("${app.simli.tts-provider:ElevenLabs}")
    private String ttsProvider;

    @Value("${app.simli.tts-voice-id:21m00Tcm4TlvDq8ikWAM}")
    private String ttsVoiceId;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public AvatarTalkResponse createTalk(String text) {
        if (!enabled) {
            throw new IllegalStateException("Simli avatar is disabled.");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Simli API key is missing.");
        }
        if (faceId == null || faceId.isBlank()) {
            throw new IllegalStateException("Simli face ID is missing.");
        }

        String cleanText = text == null ? "" : text.trim();
        if (cleanText.isBlank()) {
            throw new IllegalArgumentException("Avatar text must not be empty.");
        }

        return requestVideoGeneration(cleanText);
    }

    private AvatarTalkResponse requestVideoGeneration(String text) {
        // POST https://api.simli.ai/getVideoResponse
        // Docs: https://docs.simli.ai
        String url = apiUrl + "/getVideoResponse";

        Map<String, Object> body = new HashMap<>();
        body.put("faceId", faceId);
        body.put("tts_provider", ttsProvider);
        body.put("tts_voice_id", ttsVoiceId);
        body.put("script", text);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-simli-key", apiKey);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        @SuppressWarnings("unchecked")
        ResponseEntity<Map<String, Object>> response =
                restTemplate.exchange(url, HttpMethod.POST, request,
                        (Class<Map<String, Object>>) (Class<?>) Map.class);

        Map<String, Object> responseBody = response.getBody();

        if (responseBody == null) {
            throw new RuntimeException("Simli returned an empty response.");
        }

        // Simli returns mp4_url (and optionally hls_url)
        String videoUrl = extractString(responseBody, "mp4_url", "hls_url", "video_url", "resultUrl");

        if (videoUrl == null || videoUrl.isBlank()) {
            throw new RuntimeException("Simli did not return a video URL. Response: " + responseBody);
        }

        String talkId = extractString(responseBody, "id", "request_id");
        if (talkId == null) {
            talkId = UUID.randomUUID().toString();
        }

        return new AvatarTalkResponse(talkId, videoUrl, "done", null);
    }

    private String extractString(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object val = map.get(key);
            if (val instanceof String s && !s.isBlank()) {
                return s;
            }
        }
        return null;
    }
}
