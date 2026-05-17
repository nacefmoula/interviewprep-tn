package com.microservice.trainingservice.controller;

import com.microservice.trainingservice.dto.AwardBadgeRequest;
import com.microservice.trainingservice.dto.CreateDailyActivityRequest;
import com.microservice.trainingservice.dto.CreateTrainingPathRequest;
import com.microservice.trainingservice.dto.DailyActivityResponse;
import com.microservice.trainingservice.dto.DebugBadgeSimulationRequest;
import com.microservice.trainingservice.dto.DebugBadgeSimulationResponse;
import com.microservice.trainingservice.dto.TrainingModuleResponse;
import com.microservice.trainingservice.dto.TrainingPathResponse;
import com.microservice.trainingservice.dto.TrainingPreferencesRequest;
import com.microservice.trainingservice.dto.TrainingPreferencesResponse;
import com.microservice.trainingservice.dto.UpdateModuleProgressRequest;
import com.microservice.trainingservice.dto.UserBadgeResponse;
import com.microservice.trainingservice.dto.UserXPTrackerResponse;
import com.microservice.trainingservice.service.TrainingGamificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/training")
@RequiredArgsConstructor
public class TrainingGamificationController {

    private final TrainingGamificationService trainingGamificationService;

    @PostMapping("/paths")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingPathResponse createPath(@Valid @RequestBody CreateTrainingPathRequest request) {
        return trainingGamificationService.createTrainingPath(request);
    }

    @PostMapping("/paths/generate")
    public TrainingPathResponse generateMyPath(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Authentication required");
        }
        return trainingGamificationService.generatePersonalizedPathForUser(authentication.getName());
    }

    @GetMapping("/paths/user/{userId}")
    public TrainingPathResponse getPathByUserId(@PathVariable String userId, Authentication authentication) {
        if (!canAccessUser(userId, authentication)) {
            throw new AccessDeniedException("Not allowed to access path for user " + userId);
        }
        return trainingGamificationService.getPathByUserId(userId);
    }

    @PostMapping("/paths/new")
    public TrainingPathResponse createNewMyPath(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Authentication required");
        }
        return trainingGamificationService.createNewPathForUser(authentication.getName());
    }

    @GetMapping("/paths/me/history")
    public List<TrainingPathResponse> getMyPathHistory(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Authentication required");
        }
        return trainingGamificationService.getPathHistoryForUser(authentication.getName());
    }

    @PutMapping("/paths/{pathId}/modules/{moduleId}")
    public TrainingModuleResponse updateModuleProgress(
        @PathVariable Long pathId,
        @PathVariable Long moduleId,
        @RequestParam("userId") String userId,
        @Valid @RequestBody UpdateModuleProgressRequest request,
        Authentication authentication
    ) {
        if (!canAccessUser(userId, authentication)) {
            throw new AccessDeniedException("Not allowed to update progress for user " + userId);
        }
        return trainingGamificationService.updateModuleProgress(userId, pathId, moduleId, request);
    }

    @PostMapping("/badges/award")
    @ResponseStatus(HttpStatus.CREATED)
    public UserBadgeResponse awardBadge(@Valid @RequestBody AwardBadgeRequest request) {
        return trainingGamificationService.awardBadge(request);
    }

    @GetMapping("/badges")
    public List<com.microservice.trainingservice.dto.BadgeResponse> getActiveBadges() {
        return trainingGamificationService.getActiveBadges();
    }

    @GetMapping("/user-badges/user/{userId}")
    public List<UserBadgeResponse> getUserBadges(@PathVariable String userId, Authentication authentication) {
        if (!canAccessUser(userId, authentication)) {
            throw new AccessDeniedException("Not allowed to access badges for user " + userId);
        }
        return trainingGamificationService.getUserBadges(userId);
    }

    @PostMapping("/activities")
    public UserXPTrackerResponse recordDailyActivity(@Valid @RequestBody CreateDailyActivityRequest request) {
        return trainingGamificationService.recordDailyActivity(request);
    }

    @GetMapping("/activities/user/{userId}/today")
    public DailyActivityResponse getTodayActivity(@PathVariable String userId) {
        return trainingGamificationService.getTodayActivity(userId);
    }

    @GetMapping("/leaderboard")
    public List<UserXPTrackerResponse> getLeaderboard(@RequestParam(defaultValue = "10") int topN) {
        return trainingGamificationService.getLeaderboard(topN);
    }

    @GetMapping("/xp-tracker/user/{userId}")
    public UserXPTrackerResponse getUserXpTracker(@PathVariable String userId, Authentication authentication) {
        if (!canAccessUser(userId, authentication)) {
            throw new AccessDeniedException("Not allowed to access XP tracker for user " + userId);
        }
        return trainingGamificationService.getUserXpTracker(userId);
    }

    @GetMapping("/preferences/me")
    public TrainingPreferencesResponse getMyPreferences(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Authentication required");
        }
        return trainingGamificationService.getPreferencesForUser(authentication.getName());
    }

    @PutMapping("/preferences/me")
    public TrainingPreferencesResponse putMyPreferences(
        Authentication authentication,
        @Valid @RequestBody TrainingPreferencesRequest request
    ) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Authentication required");
        }
        return trainingGamificationService.upsertPreferencesForUser(authentication.getName(), request);
    }

    @PostMapping("/debug/badges/simulate")
    @PreAuthorize("hasRole('ADMIN')")
    public DebugBadgeSimulationResponse simulateBadges(@RequestBody DebugBadgeSimulationRequest request) {
        return trainingGamificationService.simulateBadgeTriggersForQa(request);
    }

    private boolean canAccessUser(String userId, Authentication authentication) {
        if (authentication == null) {
            return false;
        }

        if (authentication.getAuthorities() != null
            && authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            return true;
        }

        return userId != null && userId.equals(authentication.getName());
    }
}
