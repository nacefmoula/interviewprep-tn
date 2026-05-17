package com.microservice.interviewservice.config;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()

                // ── Live voice / TTS — authenticated (calls paid AI/TTS;
                //     anonymous access was a cost-abuse / DoS vector) ───────
                .requestMatchers(HttpMethod.OPTIONS, "/api/live-voice/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/live-voice/speak").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")
                .requestMatchers(HttpMethod.GET,  "/api/live-voice/available").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")

                // ── Avatar — authenticated (paid provider) ────────────────
                .requestMatchers(HttpMethod.OPTIONS, "/api/avatar/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/avatar/talk").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")

                // ── Questions ─────────────────────────────────────────────
                .requestMatchers(HttpMethod.GET,    "/api/questions/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")
                .requestMatchers(HttpMethod.POST,   "/api/questions/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/questions/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/questions/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH,  "/api/questions/**").hasRole("ADMIN")

                // ── Admin-only interview + progress routes ────────────────
                .requestMatchers("/api/interview-sessions/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/progress/admin/**").hasRole("ADMIN")

                // ── Interview sessions ────────────────────────────────────
                .requestMatchers(HttpMethod.POST,   "/api/interview-sessions/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")
                .requestMatchers(HttpMethod.GET,    "/api/interview-sessions/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")
                .requestMatchers(HttpMethod.PUT,    "/api/interview-sessions/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")
                .requestMatchers(HttpMethod.PATCH,  "/api/interview-sessions/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")
                .requestMatchers(HttpMethod.DELETE, "/api/interview-sessions/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")

                // ── Progress ──────────────────────────────────────────────
                .requestMatchers("/api/progress/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")

                // ── Live interviews ───────────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/live-interviews/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")
                .requestMatchers(HttpMethod.GET,  "/api/live-interviews/**").hasAnyRole("USER", "ADMIN", "MANAGER", "MENTOR")

                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 ->
                oauth2.jwt(jwt ->
                    jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess == null || !realmAccess.containsKey("roles")) return List.of();

            Object rolesClaim = realmAccess.get("roles");
            if (!(rolesClaim instanceof Collection<?> roles)) return List.of();

            return roles.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(SecurityConfig::normalizeRole)
                .filter(role -> !role.isBlank())
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        });
        return converter;
    }

    /**
     * Canonical Keycloak-role normalization, shared verbatim with user-service
     * JwtAuthConverter (trim + UPPERCASE + single ROLE_ prefix). Keeps role
     * matching consistent across services.
     */
    private static String normalizeRole(String role) {
        String normalized = role == null ? "" : role.trim().toUpperCase();
        if (normalized.isBlank()) {
            return "";
        }
        return normalized.startsWith("ROLE_") ? normalized : "ROLE_" + normalized;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}