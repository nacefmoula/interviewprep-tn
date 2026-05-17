package com.microservice.userservice.messaging.event;

import com.microservice.userservice.enums.IndustryEnum;
import com.microservice.userservice.enums.PlanEnum;
import com.microservice.userservice.enums.RoleEnum;
import com.microservice.userservice.enums.UserStatus;
import com.microservice.userservice.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEvent {

    private EventType eventType;
    private UUID userId;
    private String keycloakId;
    private String email;
    private String firstName;
    private String lastName;
    private RoleEnum role;
    private PlanEnum plan;
    private UserStatus status;
    private Boolean isVerified;
    private Integer karmaPoints;
    private IndustryEnum preferredIndustry;
    private String preferredLanguage;
    private LocalDateTime createdAt;
    private LocalDateTime occurredAt;

    public static UserEvent from(EventType eventType, User user) {
        return UserEvent.builder()
            .eventType(eventType)
            .userId(user.getId())
            .keycloakId(user.getKeycloakId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .plan(user.getPlan())
            .status(user.getStatus())
            .isVerified(user.getIsVerified())
            .karmaPoints(user.getKarmaPoints())
            .preferredIndustry(user.getPreferredIndustry())
            .preferredLanguage(user.getPreferredLanguage())
            .createdAt(user.getCreatedAt())
            .occurredAt(LocalDateTime.now())
            .build();
    }
}

