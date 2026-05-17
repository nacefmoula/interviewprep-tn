
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

@Service
@ConditionalOnProperty(name = "app.did.enabled", havingValue = "true")
public class DidAvatarServiceImpl implements AvatarService {

    @Value("${app.did.enabled:false}")
    private boolean enabled;

    @Value("${app.did.api-url:https://api.d-id.com}")
    private String apiUrl;

    @Value("${app.did.api-key:}")
    private String apiKey;

    @Value("${app.did.source-url:}")
    private String sourceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public AvatarTalkResponse createTalk(String text) {
        if (!enabled) {
            throw new IllegalStateException("D-ID avatar is disabled.");
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("D-ID API key is missing.");
        }

        if (sourceUrl == null || sourceUrl.isBlank()) {
            throw new IllegalStateException("D-ID source URL is missing.");
        }

        String cleanText = text == null ? "" : text.trim();

        if (cleanText.isBlank()) {
            throw new IllegalArgumentException("Avatar text must not be empty.");
        }

        String talkId = createDidTalk(cleanText);
        return waitForResult(talkId);
    }

    private String createDidTalk(String text) {
        String createUrl = apiUrl + "/talks";

        Map<String, Object> provider = new HashMap<>();
        provider.put("type", "microsoft");
        provider.put("voice_id", "en-US-JennyNeural");

        Map<String, Object> script = new HashMap<>();
        script.put("type", "text");
        script.put("input", text);
        script.put("provider", provider);

        Map<String, Object> body = new HashMap<>();
        body.put("source_url", sourceUrl);
        body.put("script", script);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, buildHeaders());

        ResponseEntity<Map> response =
                restTemplate.exchange(createUrl, HttpMethod.POST, request, Map.class);

        Map responseBody = response.getBody();

        if (responseBody == null || responseBody.get("id") == null) {
            throw new RuntimeException("D-ID did not return a talk id.");
        }

        return responseBody.get("id").toString();
    }

    private AvatarTalkResponse waitForResult(String talkId) {
        String getUrl = apiUrl + "/talks/" + talkId;
        HttpEntity<Void> request = new HttpEntity<>(buildHeaders());

        for (int i = 0; i < 30; i++) {
            ResponseEntity<Map> response =
                    restTemplate.exchange(getUrl, HttpMethod.GET, request, Map.class);

            Map body = response.getBody();

            if (body != null) {
                String status = String.valueOf(body.get("status"));

                if ("done".equalsIgnoreCase(status)) {
                    String resultUrl = String.valueOf(body.get("result_url"));

                    Double duration = null;
                    Object durationValue = body.get("duration");
                    if (durationValue instanceof Number number) {
                        duration = number.doubleValue();
                    }

                    return new AvatarTalkResponse(talkId, resultUrl, status, duration);
                }

                if ("error".equalsIgnoreCase(status)) {
                    throw new RuntimeException("D-ID video generation failed: " + body);
                }
            }

            sleep(1500);
        }

        throw new RuntimeException("D-ID video generation timeout.");
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        /*
         * Use the key exactly like your successful curl:
         * Authorization: Basic $DID_API_KEY
         */
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + apiKey);

        return headers;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("D-ID polling interrupted.", exception);
        }
    }
}