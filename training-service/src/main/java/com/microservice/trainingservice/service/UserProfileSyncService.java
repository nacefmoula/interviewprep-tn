package com.microservice.trainingservice.service;

import com.microservice.trainingservice.event.UserRegisteredEvent;
import com.microservice.trainingservice.model.PathStatus;
import com.microservice.trainingservice.model.TrainingPreferences;
import com.microservice.trainingservice.model.TrainingUserSignal;
import com.microservice.trainingservice.repository.TrainingPathRepository;
import com.microservice.trainingservice.repository.TrainingPreferencesRepository;
import com.microservice.trainingservice.repository.TrainingUserSignalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Keeps the training-service in sync with profile changes published
 * by the user-service via Kafka.
 *
 * All methods are idempotent — safe to replay on duplicate events.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileSyncService {

    private final TrainingPreferencesRepository  trainingPreferencesRepository;
    private final TrainingUserSignalRepository   trainingUserSignalRepository;
    private final TrainingPathRepository         trainingPathRepository;
    private final TrainingGamificationService    trainingGamificationService;

    // ── USER_CREATED ──────────────────────────────────────────────────────────

    /**
     * Called when a new user registers.
     * Creates an empty TrainingPreferences row so the user can immediately
     * fill in their goal/seniority from the frontend, and seeds the profile
     * snapshot with what we already know from the registration event.
     */
    @Transactional
    public void bootstrapPreferences(String userId, UserRegisteredEvent event) {
        // Idempotent: skip if already exists
        if (trainingPreferencesRepository.existsById(userId)) {
            log.debug("[sync] Preferences already exist for userId={}, skipping bootstrap", userId);
            syncProfileSnapshot(userId, event);   // still refresh snapshot
            return;
        }

        TrainingPreferences prefs = TrainingPreferences.builder()
            .userId(userId)
            // Pre-fill seniority from plan if available (cheap default)
            .seniority(resolveSeniorityFromPlan(event.getPlan()))
            .build();
        trainingPreferencesRepository.save(prefs);
        log.info("[sync] Bootstrapped TrainingPreferences for userId={}", userId);

        // Also seed the signal row with profile context
        syncProfileSnapshot(userId, event);
    }

    // ── USER_UPDATED / USER_VERIFIED ──────────────────────────────────────────

    /**
     * Refreshes the cached profile snapshot (language, industry, plan, skills)
     * in TrainingUserSignal so the path generator uses fresh data next time.
     */
    @Transactional
    public void syncProfileSnapshot(String userId, UserRegisteredEvent event) {
        TrainingUserSignal signal = trainingUserSignalRepository.findById(userId)
            .orElseGet(() -> TrainingUserSignal.builder().userId(userId).build());

        // Only overwrite if the incoming event carries a value
        if (event.getPreferredLanguage() != null) {
            signal.setPreferredLanguage(event.getPreferredLanguage());
        }
        if (event.getPreferredIndustry() != null) {
            signal.setPreferredIndustry(event.getPreferredIndustry());
        }
        if (event.getPlan() != null) {
            signal.setUserPlan(event.getPlan());
        }
        if (event.getSkills() != null && !event.getSkills().isEmpty()) {
            signal.setSkillsSnapshot(String.join(",", event.getSkills()));
        }

        trainingUserSignalRepository.save(signal);
        log.info("[sync] Profile snapshot updated for userId={} lang={} industry={} plan={}",
            userId,
            signal.getPreferredLanguage(),
            signal.getPreferredIndustry(),
            signal.getUserPlan());
    }

    // ── USER_VERIFIED ─────────────────────────────────────────────────────────

    /**
     * When a user is verified we attempt to generate their first personalized
     * path automatically. If one already exists this is a no-op (the path
     * generator skips creation when a non-archived path exists).
     */
    @Transactional
    public void triggerInitialPath(String userId) {
        boolean hasActivePath = !trainingPathRepository
            .findNonArchivedByUserIdEagerModulesOrderByCreatedAtDesc(userId, PathStatus.ARCHIVED)
            .isEmpty();

        if (hasActivePath) {
            log.debug("[sync] User {} already has an active path, skipping auto-generate", userId);
            return;
        }

        try {
            trainingGamificationService.generatePersonalizedPathForUser(userId);
            log.info("[sync] Auto-generated first training path for verified user={}", userId);
        } catch (Exception e) {
            // Path generation must never fail user verification flow
            log.warn("[sync] Auto path generation failed for userId={}: {}", userId, e.getMessage());
        }
    }

    // ── USER_DELETED ──────────────────────────────────────────────────────────

    /**
     * Archives all non-archived training paths for a deleted user.
     * Data is kept for audit / possible restore — nothing is hard-deleted.
     */
    @Transactional
    public void archiveUserData(String userId) {
        var paths = trainingPathRepository
            .findNonArchivedByUserIdEagerModulesOrderByCreatedAtDesc(userId, PathStatus.ARCHIVED);
        if (paths.isEmpty()) {
            log.debug("[sync] No active paths to archive for deleted userId={}", userId);
            return;
        }
        paths.forEach(p -> p.setStatus(PathStatus.ARCHIVED));
        trainingPathRepository.saveAll(paths);
        log.info("[sync] Archived {} path(s) for deleted userId={}", paths.size(), userId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String resolveSeniorityFromPlan(String plan) {
        if (plan == null) return null;
        return switch (plan.toUpperCase()) {
            case "PREMIUM" -> "intermediate";
            default        -> null;   // leave blank; user fills on onboarding
        };
    }
}
