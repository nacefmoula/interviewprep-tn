package com.microservice.mentorshipservice.DTOs;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Setter
@Getter
public class MentorSessionDTO {
    private UUID requestId;
    private LocalDateTime scheduledAt;
    private String meetingLink;

}