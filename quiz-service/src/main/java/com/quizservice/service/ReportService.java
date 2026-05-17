package com.quizservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final RestTemplate restTemplate;

    // Utilise le port 8680 (ou celui que tu as mis dans ton terminal Python)
    @Value("${ai.report.url:http://localhost:8680}")
    private String aiServiceUrl;

    public Map<String, Object> generateReport(String userId) {
        try {
            String url = aiServiceUrl + "/api/report/" + userId;
            log.info("Appel du service IA à l'URL : {}", url);

            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.warn("Impossible de contacter le service IA sur {} : {}", aiServiceUrl, e.getMessage());
            return Map.of("error", "Le bilan IA est indisponible pour le moment.");
        }
    }
}