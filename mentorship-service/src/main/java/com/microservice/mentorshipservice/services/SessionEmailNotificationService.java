package com.microservice.mentorshipservice.services;

import com.microservice.mentorshipservice.DTOs.UserResponse;
import com.microservice.mentorshipservice.clients.UserServiceClient;
import com.microservice.mentorshipservice.emails.templates.SessionCancelledEmailTemplate;
import com.microservice.mentorshipservice.emails.templates.SessionReminderEmailTemplate;
import com.microservice.mentorshipservice.entities.MentorRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Service
public class SessionEmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SessionEmailNotificationService.class);

    private final UserServiceClient userServiceClient;
    private final AsyncEmailSendService asyncEmailSendService;
    private final SessionReminderEmailTemplate sessionReminderEmailTemplate;
    private final SessionCancelledEmailTemplate sessionCancelledEmailTemplate;

    public SessionEmailNotificationService(UserServiceClient userServiceClient,
                                          AsyncEmailSendService asyncEmailSendService,
                                          SessionReminderEmailTemplate sessionReminderEmailTemplate,
                                          SessionCancelledEmailTemplate sessionCancelledEmailTemplate) {
        this.userServiceClient = userServiceClient;
        this.asyncEmailSendService = asyncEmailSendService;
        this.sessionReminderEmailTemplate = sessionReminderEmailTemplate;
        this.sessionCancelledEmailTemplate = sessionCancelledEmailTemplate;
    }

    public void notifySessionScheduled(MentorRequest request, LocalDateTime scheduledAt) {
        if (request == null) {
            return;
        }

        OffsetDateTime scheduledAtOffset = scheduledAt == null
                ? null
                : scheduledAt.atZone(ZoneId.systemDefault()).toOffsetDateTime();

        UserResponse mentor = safeGetUser(request.getMentorId());
        UserResponse mentee = safeGetUser(request.getMenteeId());

        String mentorEmail = mentor == null ? null : mentor.getEmail();
        String menteeEmail = mentee == null ? null : mentee.getEmail();

        String mentorName = displayName(mentor);
        String menteeName = displayName(mentee);

        String mentorHtml = null;
        if (StringUtils.hasText(mentorEmail)) {
            mentorHtml = sessionReminderEmailTemplate.render(
                    mentorName,
                    "your mentee",
                    menteeName,
                    scheduledAtOffset
            );
        } else {
            log.debug("Skipping mentor reminder: mentorEmail missing (requestId={})", request.getId());
        }

        String menteeHtml = null;
        if (StringUtils.hasText(menteeEmail)) {
            menteeHtml = sessionReminderEmailTemplate.render(
                    menteeName,
                    "your mentor",
                    mentorName,
                    scheduledAtOffset
            );
        } else {
            log.debug("Skipping mentee reminder: menteeEmail missing (requestId={})", request.getId());
        }

        asyncEmailSendService.sendTwoSequentialBestEffort(
                mentorEmail, "Session reminder", mentorHtml, "mentor reminder",
                menteeEmail, "Session reminder", menteeHtml, "mentee reminder",
                request.getId()
        );
    }

    public void notifySessionCancelled(MentorRequest request, LocalDateTime scheduledAt) {
        if (request == null) {
            return;
        }

        OffsetDateTime scheduledAtOffset = scheduledAt == null
                ? null
                : scheduledAt.atZone(ZoneId.systemDefault()).toOffsetDateTime();

        UserResponse mentor = safeGetUser(request.getMentorId());
        UserResponse mentee = safeGetUser(request.getMenteeId());

        String mentorEmail = mentor == null ? null : mentor.getEmail();
        String menteeEmail = mentee == null ? null : mentee.getEmail();

        String mentorName = displayName(mentor);
        String menteeName = displayName(mentee);

        String mentorHtml = null;
        if (StringUtils.hasText(mentorEmail)) {
            mentorHtml = sessionCancelledEmailTemplate.render(
                    mentorName,
                    "your mentee",
                    menteeName,
                    scheduledAtOffset
            );
        }

        String menteeHtml = null;
        if (StringUtils.hasText(menteeEmail)) {
            menteeHtml = sessionCancelledEmailTemplate.render(
                    menteeName,
                    "your mentor",
                    mentorName,
                    scheduledAtOffset
            );
        }

        asyncEmailSendService.sendTwoSequentialBestEffort(
                mentorEmail, "Session cancelled", mentorHtml, "mentor cancellation",
                menteeEmail, "Session cancelled", menteeHtml, "mentee cancellation",
                request.getId()
        );
    }

    private UserResponse safeGetUser(UUID id) {
        if (id == null) {
            return null;
        }
        try {
            return userServiceClient.getUserById(id);
        } catch (Exception ex) {
            log.warn("Failed fetching user {} from user-service", id, ex);
            return null;
        }
    }

    private static String displayName(UserResponse user) {
        if (user == null) {
            return "";
        }

        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();

        if (!full.isBlank()) {
            return full;
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail().trim();
        }

        return "";
    }
}
