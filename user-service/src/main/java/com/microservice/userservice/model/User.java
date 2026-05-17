package com.microservice.userservice.model;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.microservice.userservice.enums.IndustryEnum;
import com.microservice.userservice.enums.PlanEnum;
import com.microservice.userservice.enums.RoleEnum;
import com.microservice.userservice.enums.UserStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String keycloakId;

    @Column(unique = true, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleEnum role;

    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String city;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String avatarUrl;

    private String cvUrl;

    @Column(nullable = false)
    @Builder.Default
    private Integer karmaPoints = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserStatus status = UserStatus.PENDING_VERIFICATION;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PlanEnum plan = PlanEnum.FREE;

    @Column(nullable = false)
    @Builder.Default
    private Integer simulationsUsedThisMonth = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer simulationsLimit = 3;

    @Column(nullable = false)
    @Builder.Default
    private Boolean subscriptionActive = false;

    private LocalDateTime subscriptionStart;
    private LocalDateTime subscriptionEnd;

    @Builder.Default
    private String preferredLanguage = "fr";

    @Column(nullable = false)
    @Builder.Default
    private Boolean emailNotificationsEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean pushNotificationsEnabled = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean profileVisible = true;

    @Enumerated(EnumType.STRING)
    private IndustryEnum preferredIndustry;

    @Column(columnDefinition = "TEXT")
    private String experiencesJson;

    @Column(columnDefinition = "TEXT")
    private String educationsJson;

    @Column(columnDefinition = "TEXT")
    private String skillsJson;

    private LocalDateTime lastLoginAt;

    // ── Passkey (informational only — auth truth lives in Keycloak) ──
    @Column(nullable = false)
    @Builder.Default
    private Boolean passkeyRegistered = false;

    private LocalDateTime passkeyRegisteredAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private LocalDateTime deletedAt;
}