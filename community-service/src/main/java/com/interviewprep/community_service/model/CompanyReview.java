package com.interviewprep.community_service.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "company_reviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CompanyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "author_keycloak_id", nullable = false)
    private String authorKeycloakId;

    @Column(name = "company_name_display", nullable = false)
    private String companyNameDisplay;

    @Column(name = "company_name_normalized", nullable = false)
    private String companyNameNormalized;

    @Column(name = "role_title", nullable = false)
    private String roleTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", nullable = false, length = 50)
    private InterviewTypeEnum interviewType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private DifficultyEnum difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private OutcomeEnum outcome;

    @Column(name = "overall_rating", nullable = false)
    private Integer overallRating;

    @Column(name = "review_text", nullable = false, columnDefinition = "TEXT")
    private String reviewText;

    @Column(name = "process_description", columnDefinition = "TEXT")
    private String processDescription;

    @Column(name = "is_anonymous", nullable = false)
    @Builder.Default
    private boolean isAnonymous = false;

    @Column(name = "helpful_count", nullable = false)
    @Builder.Default
    private Integer helpfulCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void prePersist() {
        companyNameNormalized = companyNameDisplay.trim().toLowerCase();
    }
}
