package com.microservice.mentorshipservice.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mentor_ratings",
    uniqueConstraints = @UniqueConstraint(columnNames = {"mentee_id", "mentor_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class MentorRating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID menteeId;
    private UUID mentorId;
    private UUID sessionId;

    @Column(nullable = false)
    private int stars; // 1-5

    private String comment;
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}