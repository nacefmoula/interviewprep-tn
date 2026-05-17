package com.microservice.resourceservice.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Slf4j
public class ResourceAccessControlService {

    private final RestTemplate restTemplate;
    private final String userServiceBaseUrl;

    public ResourceAccessControlService(
        RestTemplate restTemplate,
        @Value("${services.user-service.base-url:http://localhost:8081}") String userServiceBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.userServiceBaseUrl = userServiceBaseUrl;
    }

    public void assertCanAdminResources(Jwt jwt) {
        if (jwt == null) {
            throw new AccessDeniedException("Authentication required");
        }

        if (hasRealmRole(jwt, "ROLE_ADMIN")) {
            return;
        }

        String appRole = getApplicationRole(jwt.getTokenValue());
        if (!"ADMIN".equals(appRole)) {
            throw new AccessDeniedException("Admin role required");
        }
    }

    private boolean hasRealmRole(Jwt jwt, String expectedRole) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null) {
            return false;
        }

        Object rolesObj = realmAccess.get("roles");
        if (!(rolesObj instanceof List<?> roles)) {
            return false;
        }

        for (Object roleObj : roles) {
            if (roleObj instanceof String role) {
                String normalized = role.trim().toUpperCase(Locale.ROOT);
                if (expectedRole.equals(normalized)
                    || expectedRole.replace("ROLE_", "").equals(normalized)) {
                    return true;
                }
            }
        }

        return false;
    }

    private String getApplicationRole(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(bearerToken);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                userServiceBaseUrl + "/api/users/me",
                HttpMethod.GET,
                entity,
                (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("role") == null) {
                log.warn("user-service /api/users/me returned no role; denying access");
                throw new AccessDeniedException("Unable to resolve application role");
            }

            return String.valueOf(body.get("role")).trim().toUpperCase(Locale.ROOT);
        } catch (AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            log.warn("user-service is unreachable ({}); denying access by default", e.getMessage());
            throw new AccessDeniedException("Admin role required (user-service unavailable)");
        }
    }
}
