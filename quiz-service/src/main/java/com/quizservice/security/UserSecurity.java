package com.quizservice.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("userSecurity")
public class UserSecurity {

    // Vérifie que le user connecté est le créateur du quiz
    public boolean isQuizOwner(Authentication authentication, UUID quizCreatedBy) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return currentUserId.equals(quizCreatedBy);
    }

    // Récupère l'ID du user connecté depuis le token
    public UUID getCurrentUserId(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return UUID.fromString(jwt.getSubject());
    }

    // Récupère le username du user connecté
    public String getCurrentUsername(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return jwt.getClaim("preferred_username");
    }

    // À ajouter dans ta classe UserSecurity.java
    public boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

}