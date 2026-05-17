package com.quizservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

// ============================================================
// PROBLÈME TROUVÉ dans votre SecurityConfig actuel :
//
// Vous avez ces deux règles dans cet ordre :
//   1. .requestMatchers(POST, "/api/quizzes/ai/generate").permitAll()
//   2. .requestMatchers(POST, "/api/quizzes/**").hasAnyAuthority("ROLE_ADMIN","ROLE_MANAGER")
//
// Spring Security évalue les règles dans l'ORDRE où elles sont déclarées.
// La règle 1 devrait matcher en premier → OK.
//
// MAIS vous avez AUSSI déclaré la règle 1 en DOUBLE (lignes 1 et fin du bloc).
// Le vrai problème : l'ordre d'évaluation dans votre code actuel.
//
// Dans votre SecurityConfig, la ligne :
//   .requestMatchers(POST, "/api/quizzes/**").hasAnyAuthority("ROLE_ADMIN","ROLE_MANAGER")
// est placée AVANT le second .permitAll() en fin de bloc.
// Spring utilise la PREMIÈRE règle qui matche, donc :
//   POST /api/quizzes/ai/generate → matche /api/quizzes/** (ADMIN requis) → 403
//
// FIX : Mettre /api/quizzes/ai/** en PREMIER, avant toute règle /api/quizzes/**
// ============================================================
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationConverter jwtAuthenticationConverter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth

                        // ── Actuator & Swagger ─────────────────────────────────
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()

                        // ── ✅ FIX : endpoints IA EN PREMIER, avant /api/quizzes/** ──
                        // Ces règles doivent être AVANT toutes les règles /api/quizzes/**
                        // sinon la règle générale POST /api/quizzes/** s'applique en premier
                        .requestMatchers(HttpMethod.POST, "/api/quizzes/ai/**").permitAll()
                        .requestMatchers(HttpMethod.GET,  "/api/quizzes/ai/**").permitAll()

                        // ── Quiz endpoints ────────────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/quizzes/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/quizzes/*/start").authenticated()

                        // ADMIN/MANAGER uniquement pour créer/modifier/supprimer
                        .requestMatchers(HttpMethod.POST,   "/api/quizzes/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.PUT,    "/api/quizzes/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.PATCH,  "/api/quizzes/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/quizzes/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/report/**").authenticated()


                        // ── Attempts ──────────────────────────────────────────
                        .requestMatchers("/api/attempts/**").authenticated()

                        // ── Leaderboard ───────────────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/leaderboard/**").permitAll()

                        // ── Stats ─────────────────────────────────────────────
                        .requestMatchers("/api/stats/**").hasAuthority("ROLE_ADMIN")

                        // ── Tout le reste ─────────────────────────────────────
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}