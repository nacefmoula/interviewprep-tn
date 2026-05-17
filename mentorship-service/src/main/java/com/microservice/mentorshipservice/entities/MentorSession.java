package com.microservice.mentorshipservice.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.microservice.mentorshipservice.enums.SessionStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Setter
@Getter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "mentor_sessions")
public class MentorSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID requestId;
    private LocalDateTime scheduledAt;
    private String meetingLink;
    @Enumerated(EnumType.STRING)
    private SessionStatus status;
}
