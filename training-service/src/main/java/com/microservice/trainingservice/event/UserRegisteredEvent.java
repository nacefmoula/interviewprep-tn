package com.microservice.trainingservice.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Mirror DTO for the UserEvent published by user-service.
 * Only the fields we care about for training personalization are mapped;
 * all other fields are silently ignored via @JsonIgnoreProperties.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserRegisteredEvent {

    private String eventType;   // USER_CREATED | USER_UPDATED | USER_VERIFIED | USER_DELETED

    private UUID   userId;
    private String keycloakId;
    private String email;
    private String firstName;
    private String lastName;

    // ── Training-relevant profile fields ──────────────────────────────────────
    private String  preferredLanguage;   // "fr", "en", …
    private String  preferredIndustry;   // IndustryEnum value
    private String  plan;                // PlanEnum  FREE | PREMIUM
    private String  status;              // UserStatus
    private Boolean isVerified;

    private List<String> skills;         // deserialized from user-service skillsJson

    private LocalDateTime createdAt;
    private LocalDateTime occurredAt;
}
