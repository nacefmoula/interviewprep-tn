package com.microservice.userservice.service;

import com.microservice.userservice.enums.RoleEnum;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Calls Keycloak's admin REST API to keep a user's realm-role membership in
 * sync with the {@link RoleEnum} stored in our DB.
 *
 * Uses the master-realm admin credentials (same path as the seed-test-users.sh
 * script). Failures are logged but never thrown — the DB is the source of
 * truth, Keycloak sync is best-effort. The user's next login will reflect
 * whatever realm roles are present at that moment.
 */
@Component
@Slf4j
public class KeycloakAdminClient {

    private static final Map<RoleEnum, String> APP_TO_REALM_ROLE = Map.of(
            RoleEnum.USER,    "ROLE_USER",
            RoleEnum.STUDENT, "ROLE_USER",
            RoleEnum.MENTOR,  "ROLE_MENTOR",
            RoleEnum.MANAGER, "ROLE_MANAGER",
            RoleEnum.ADMIN,   "ROLE_ADMIN"
    );

    private static final Set<String> MANAGED_ROLES = Set.of(
            "ROLE_USER", "ROLE_MENTOR", "ROLE_MANAGER", "ROLE_ADMIN"
    );

    private final RestClient http;
    private final String realm;
    private final String adminUser;
    private final String adminPassword;

    private volatile String cachedToken;
    private volatile Instant cachedTokenExpiresAt = Instant.EPOCH;

    public KeycloakAdminClient(
            @Value("${keycloak.server-url:http://keycloak:8080}") String serverUrl,
            @Value("${keycloak.realm:myapp-realm}") String realm,
            @Value("${keycloak.admin:admin}") String adminUser,
            @Value("${keycloak.admin-password:admin}") String adminPassword) {
        this.http = RestClient.builder().baseUrl(serverUrl).build();
        this.realm = realm;
        this.adminUser = adminUser;
        this.adminPassword = adminPassword;
    }

    /**
     * Ensure the user identified by {@code keycloakId} has exactly the realm
     * role corresponding to {@code role}, removing other managed ROLE_* roles
     * (so promotions and demotions both work).
     *
     * Best-effort: on any failure, logs and returns silently.
     */
    public void syncUserRealmRole(String keycloakId, RoleEnum role) {
        if (keycloakId == null || keycloakId.isBlank()) {
            log.warn("Cannot sync Keycloak role: keycloakId is missing");
            return;
        }
        String targetRole = APP_TO_REALM_ROLE.get(role);
        if (targetRole == null) {
            log.warn("No Keycloak role mapping for {} — skipping sync", role);
            return;
        }
        try {
            String token = getAdminToken();
            List<Map<String, Object>> currentRoles = fetchUserRealmRoles(token, keycloakId);

            // Remove all managed ROLE_* that don't match the target.
            List<Map<String, Object>> toRemove = currentRoles.stream()
                    .filter(r -> r.get("name") instanceof String n
                            && MANAGED_ROLES.contains(n)
                            && !n.equals(targetRole))
                    .toList();
            if (!toRemove.isEmpty()) {
                deleteUserRealmRoles(token, keycloakId, toRemove);
            }

            // Add the target role only if not already present.
            boolean alreadyHas = currentRoles.stream()
                    .anyMatch(r -> targetRole.equals(r.get("name")));
            if (!alreadyHas) {
                Map<String, Object> roleDef = fetchRoleDefinition(token, targetRole);
                addUserRealmRoles(token, keycloakId, List.of(roleDef));
            }

            log.info("Keycloak realm role synced for user {}: target={}", keycloakId, targetRole);
        } catch (RuntimeException e) {
            log.warn("Keycloak role sync failed for user {} (target={}): {} — DB role saved, Keycloak unchanged",
                    keycloakId, targetRole, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private String getAdminToken() {
        if (cachedToken != null && Instant.now().isBefore(cachedTokenExpiresAt)) {
            return cachedToken;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("client_id", "admin-cli");
        form.add("username", adminUser);
        form.add("password", adminPassword);

        Map<String, Object> body = http.post()
                .uri("/realms/master/protocol/openid-connect/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    throw new IllegalStateException("Token endpoint returned " + res.getStatusCode());
                })
                .body(Map.class);

        if (body == null || !body.containsKey("access_token")) {
            throw new IllegalStateException("Token response missing access_token");
        }
        cachedToken = (String) body.get("access_token");
        int expiresIn = body.get("expires_in") instanceof Number n ? n.intValue() : 60;
        // Refresh 30 s before actual expiry to avoid mid-call expirations.
        cachedTokenExpiresAt = Instant.now().plusSeconds(Math.max(expiresIn - 30, 30));
        return cachedToken;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchUserRealmRoles(String token, String keycloakId) {
        return http.get()
                .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, keycloakId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(List.class);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchRoleDefinition(String token, String roleName) {
        return http.get()
                .uri("/admin/realms/{realm}/roles/{role}", realm, roleName)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    throw new IllegalStateException("Realm role '" + roleName
                            + "' not found (HTTP " + res.getStatusCode() + ")");
                })
                .body(Map.class);
    }

    private void addUserRealmRoles(String token, String keycloakId, List<Map<String, Object>> roles) {
        http.post()
                .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, keycloakId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(roles)
                .retrieve()
                .toBodilessEntity();
    }

    private void deleteUserRealmRoles(String token, String keycloakId, List<Map<String, Object>> roles) {
        http.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, keycloakId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(roles)
                .retrieve()
                .toBodilessEntity();
    }
}
