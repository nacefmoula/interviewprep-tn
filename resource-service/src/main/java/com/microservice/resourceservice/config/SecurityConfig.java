package com.microservice.resourceservice.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${cors.allowed-origins:http://localhost:*}")
    private String corsAllowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthConverter jwtAuthConverter) throws Exception {
        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(jwtAuthConverter);

        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/{id:[0-9a-fA-F\\-]{36}}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/*/ai/summary").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/*/ai/summary/stream").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/*/ai/similar").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/*/ai/translate").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/*/ai/quality").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/resources/ai/check-duplicate").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/resources/ai/classify").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/search").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/filter").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/categories").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/ai/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/ai/*/summary").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/stats").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/resources/*/view").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(corsAllowedOrigins.split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
