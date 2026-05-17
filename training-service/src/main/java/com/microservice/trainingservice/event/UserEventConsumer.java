package com.microservice.trainingservice.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.trainingservice.service.UserProfileSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Listens to user lifecycle events published by user-service and keeps
 * the training-service in sync with the user's profile data.
 *
 * Topics consumed:
 *   user.created  → bootstrap TrainingPreferences + cache profile snapshot
 *   user.updated  → refresh cached language / industry / skills
 *   user.verified → trigger first personalized path generation
 *   user.deleted  → archive all active training paths for the user
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventConsumer {

    private final ObjectMapper           objectMapper;
    private final UserProfileSyncService userProfileSyncService;

    @KafkaListener(
        topics   = {"user.created", "user.updated", "user.verified", "user.deleted"},
        groupId  = "training-service-user-sync"
    )
    public void onUserEvent(String payload) {
        UserRegisteredEvent event;
        try {
            event = objectMapper.readValue(payload, UserRegisteredEvent.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize user event payload: {}", payload, e);
            return;
        }

        if (event.getUserId() == null && event.getKeycloakId() == null) {
            log.warn("Received user event with null userId and keycloakId, skipping");
            return;
        }

        // Resolve the userId string the training service uses (keycloakId)
        String userId = event.getKeycloakId() != null
            ? event.getKeycloakId()
            : event.getUserId().toString();

        String eventType = event.getEventType() == null ? "" : event.getEventType();

        switch (eventType) {

            case "USER_CREATED" -> {
                log.info("[training] USER_CREATED: bootstrapping preferences for userId={}", userId);
                userProfileSyncService.bootstrapPreferences(userId, event);
            }

            case "USER_UPDATED" -> {
                log.info("[training] USER_UPDATED: syncing profile snapshot for userId={}", userId);
                userProfileSyncService.syncProfileSnapshot(userId, event);
            }

            case "USER_VERIFIED" -> {
                log.info("[training] USER_VERIFIED: triggering initial path for userId={}", userId);
                userProfileSyncService.syncProfileSnapshot(userId, event);
                userProfileSyncService.triggerInitialPath(userId);
            }

            case "USER_DELETED" -> {
                log.info("[training] USER_DELETED: archiving paths for userId={}", userId);
                userProfileSyncService.archiveUserData(userId);
            }

            default ->
                log.debug("[training] Ignoring user event type={} for userId={}", eventType, userId);
        }
    }
}
