package com.microservice.resourceservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
    name = "user_resource_engagements",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "resource_id"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResourceEngagement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "NOT_STARTED";

    @Column(name = "progress_pct", nullable = false)
    @Builder.Default
    private short progressPct = 0;

    @Column(name = "open_count", nullable = false)
    @Builder.Default
    private int openCount = 0;

    @Column(length = 600)
    private String notes;

    @Column(name = "first_opened_at")
    private OffsetDateTime firstOpenedAt;

    @Column(name = "last_opened_at")
    private OffsetDateTime lastOpenedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "user_resource_engagement_days",
        joinColumns = @JoinColumn(name = "engagement_id")
    )
    @Column(name = "day_key", length = 10)
    @Builder.Default
    private Set<String> activityDays = new HashSet<>();
}
