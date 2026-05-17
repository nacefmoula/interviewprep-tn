package com.microservice.mentorshipservice.controllers;

import com.microservice.mentorshipservice.emails.templates.SessionReminderEmailTemplate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.microservice.mentorshipservice.services.EmailService;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/emails")
@Validated
public class EmailController {

    private final EmailService emailService;
    private final SessionReminderEmailTemplate sessionReminderEmailTemplate;

    public EmailController(EmailService emailService,
                           SessionReminderEmailTemplate sessionReminderEmailTemplate) {
        this.emailService = emailService;
        this.sessionReminderEmailTemplate = sessionReminderEmailTemplate;
    }

    /**
     * Step-1 endpoint: manually send a test HTML email (Mailtrap SMTP).
     */
    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> sendTest(@Valid @RequestBody SendTestEmailRequest request) {
        emailService.sendHtml(request.to(), request.subject(), request.html());
        return ResponseEntity.noContent().build();
    }

        /**
         * Step-2 endpoint: manually send a templated session reminder HTML email (Mailtrap SMTP).
         */
        @PostMapping("/session-reminder/test")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<Void> sendSessionReminderTest(@Valid @RequestBody SendSessionReminderTestEmailRequest request) {
        String otherPartyLabel = resolveOtherPartyLabel(request);

            OffsetDateTime scheduledAt = parseScheduledAt(request.scheduledAt());

        String html = sessionReminderEmailTemplate.render(
            request.recipientName(),
            otherPartyLabel,
            request.otherPartyName(),
                scheduledAt
        );

        String subject = (request.subject() == null || request.subject().isBlank())
            ? "Session reminder"
            : request.subject();

        emailService.sendHtml(request.to(), subject, html);
        return ResponseEntity.noContent().build();
        }

    private static String resolveOtherPartyLabel(SendSessionReminderTestEmailRequest request) {
        if (request.recipientType() != null && !request.recipientType().isBlank()) {
            String recipientType = request.recipientType().trim().toLowerCase(Locale.ROOT);
            return switch (recipientType) {
                case "mentor" -> "your mentee";
                case "mentee" -> "your mentor";
                default -> throw new IllegalArgumentException("recipientType must be MENTOR or MENTEE");
            };
        }

        if (request.otherPartyLabel() == null || request.otherPartyLabel().isBlank()) {
            return "mentor/mentee";
        }

        String otherPartyLabel = request.otherPartyLabel().trim();
        String normalized = otherPartyLabel.toLowerCase(Locale.ROOT);
        if (normalized.equals("mentor")) {
            return "your mentor";
        }
        if (normalized.equals("mentee")) {
            return "your mentee";
        }
        return otherPartyLabel;
    }

    private static OffsetDateTime parseScheduledAt(String scheduledAt) {
        if (scheduledAt == null || scheduledAt.isBlank()) {
            throw new IllegalArgumentException("scheduledAt is required (ISO-8601)");
        }

        try {
            return OffsetDateTime.parse(scheduledAt);
        } catch (DateTimeParseException ignored) {
            // Fallback: accept local datetime and assume system default zone.
            // Common variants sent from Postman: without seconds, or with space separator.
            List<DateTimeFormatter> localFormatters = List.of(
                    DateTimeFormatter.ISO_LOCAL_DATE_TIME,
                    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm", Locale.ROOT),
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm", Locale.ROOT),
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss", Locale.ROOT)
            );

            for (DateTimeFormatter formatter : localFormatters) {
                try {
                    LocalDateTime localDateTime = LocalDateTime.parse(scheduledAt, formatter);
                    return localDateTime.atZone(ZoneId.systemDefault()).toOffsetDateTime();
                } catch (DateTimeParseException ignoredAgain) {
                    // try next
                }
            }

            throw new IllegalArgumentException(
                    "scheduledAt must be ISO-8601, e.g. '2026-04-11T20:30:00Z' or '2026-04-11T20:30'"
            );
        }
    }

    public record SendTestEmailRequest(
            @Email @NotBlank String to,
            @NotBlank String subject,
            @NotBlank String html
    ) {}

        public record SendSessionReminderTestEmailRequest(
            @Email @NotBlank String to,
            String subject,
            @NotBlank String recipientName,
            String recipientType,
            String otherPartyLabel,
            @NotBlank String otherPartyName,
                @NotBlank String scheduledAt,
            String meetingLink
        ) {}
}
