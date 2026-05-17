package com.microservice.trainingservice.controller;

import com.microservice.trainingservice.dto.BadgeResponse;
import com.microservice.trainingservice.dto.BadgeUpsertRequest;
import com.microservice.trainingservice.dto.DailyActivityResponse;
import com.microservice.trainingservice.dto.DailyActivityUpsertRequest;
import com.microservice.trainingservice.dto.GenerateMissingLessonsRequest;
import com.microservice.trainingservice.dto.GenerateMissingLessonsResponse;
import com.microservice.trainingservice.dto.TrainingModuleResponse;
import com.microservice.trainingservice.dto.TrainingModuleUpsertRequest;
import com.microservice.trainingservice.dto.TrainingPathResponse;
import com.microservice.trainingservice.dto.TrainingPathUpsertRequest;
import com.microservice.trainingservice.dto.TrainingLessonResponse;
import com.microservice.trainingservice.dto.TrainingLessonUpsertRequest;
import com.microservice.trainingservice.dto.UserBadgeResponse;
import com.microservice.trainingservice.dto.UserBadgeUpsertRequest;
import com.microservice.trainingservice.dto.UserXPTrackerResponse;
import com.microservice.trainingservice.dto.UserXPTrackerUpsertRequest;
import com.microservice.trainingservice.service.TrainingAdminContentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/training")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TrainingAdminContentController {

    private final TrainingAdminContentService trainingAdminContentService;

    @GetMapping("/badges")
    public List<BadgeResponse> getAllBadges() {
        return trainingAdminContentService.getAllBadges();
    }

    @GetMapping("/badges/{id}")
    public BadgeResponse getBadgeById(@PathVariable Long id) {
        return trainingAdminContentService.getBadgeById(id);
    }

    @PostMapping("/badges")
    @ResponseStatus(HttpStatus.CREATED)
    public BadgeResponse createBadge(@Valid @RequestBody BadgeUpsertRequest request) {
        return trainingAdminContentService.createBadge(request);
    }

    @PutMapping("/badges/{id}")
    public BadgeResponse updateBadge(@PathVariable Long id, @Valid @RequestBody BadgeUpsertRequest request) {
        return trainingAdminContentService.updateBadge(id, request);
    }

    @DeleteMapping("/badges/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBadge(@PathVariable Long id) {
        trainingAdminContentService.deleteBadge(id);
    }

    @GetMapping("/modules")
    public List<TrainingModuleResponse> getAllModules() {
        return trainingAdminContentService.getAllModules();
    }

    @GetMapping("/lessons")
    public List<TrainingLessonResponse> getAllLessons(@RequestParam(required = false) Boolean active) {
        return trainingAdminContentService.getAllLessons(active);
    }

    @GetMapping("/lessons/{id}")
    public TrainingLessonResponse getLessonById(@PathVariable Long id) {
        return trainingAdminContentService.getLessonById(id);
    }

    @PostMapping("/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingLessonResponse createLesson(@RequestBody TrainingLessonUpsertRequest request) {
        return trainingAdminContentService.createLesson(request);
    }

    @PostMapping("/lessons/generate-missing")
    @ResponseStatus(HttpStatus.CREATED)
    public GenerateMissingLessonsResponse generateMissingLessons(@Valid @RequestBody GenerateMissingLessonsRequest request) {
        return trainingAdminContentService.generateMissingDraftLessons(request);
    }

    @PutMapping("/lessons/{id}")
    public TrainingLessonResponse updateLesson(@PathVariable Long id, @RequestBody TrainingLessonUpsertRequest request) {
        return trainingAdminContentService.updateLesson(id, request);
    }

    @DeleteMapping("/lessons/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLesson(@PathVariable Long id) {
        trainingAdminContentService.deleteLesson(id);
    }

    @GetMapping("/modules/{id}")
    public TrainingModuleResponse getModuleById(@PathVariable Long id) {
        return trainingAdminContentService.getModuleById(id);
    }

    @PostMapping("/modules")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingModuleResponse createModule(@Valid @RequestBody TrainingModuleUpsertRequest request) {
        return trainingAdminContentService.createModule(request);
    }

    @PutMapping("/modules/{id}")
    public TrainingModuleResponse updateModule(@PathVariable Long id, @Valid @RequestBody TrainingModuleUpsertRequest request) {
        return trainingAdminContentService.updateModule(id, request);
    }

    @DeleteMapping("/modules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteModule(@PathVariable Long id) {
        trainingAdminContentService.deleteModule(id);
    }

    @GetMapping("/paths")
    public List<TrainingPathResponse> getAllPaths() {
        return trainingAdminContentService.getAllPaths();
    }

    @GetMapping("/paths/{id}")
    public TrainingPathResponse getPathById(@PathVariable Long id) {
        return trainingAdminContentService.getPathById(id);
    }

    @PostMapping("/paths")
    @ResponseStatus(HttpStatus.CREATED)
    public TrainingPathResponse createPath(@Valid @RequestBody TrainingPathUpsertRequest request) {
        return trainingAdminContentService.createPath(request);
    }

    @PutMapping("/paths/{id}")
    public TrainingPathResponse updatePath(@PathVariable Long id, @Valid @RequestBody TrainingPathUpsertRequest request) {
        return trainingAdminContentService.updatePath(id, request);
    }

    @DeleteMapping("/paths/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePath(@PathVariable Long id) {
        trainingAdminContentService.deletePath(id);
    }

    @GetMapping("/user-badges")
    public List<UserBadgeResponse> getAllUserBadges() {
        return trainingAdminContentService.getAllUserBadges();
    }

    @GetMapping("/user-badges/{id}")
    public UserBadgeResponse getUserBadgeById(@PathVariable Long id) {
        return trainingAdminContentService.getUserBadgeById(id);
    }

    @PostMapping("/user-badges")
    @ResponseStatus(HttpStatus.CREATED)
    public UserBadgeResponse createUserBadge(@Valid @RequestBody UserBadgeUpsertRequest request) {
        return trainingAdminContentService.createUserBadge(request);
    }

    @PutMapping("/user-badges/{id}")
    public UserBadgeResponse updateUserBadge(@PathVariable Long id, @Valid @RequestBody UserBadgeUpsertRequest request) {
        return trainingAdminContentService.updateUserBadge(id, request);
    }

    @DeleteMapping("/user-badges/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUserBadge(@PathVariable Long id) {
        trainingAdminContentService.deleteUserBadge(id);
    }

    @GetMapping("/xp-trackers")
    public List<UserXPTrackerResponse> getAllTrackers() {
        return trainingAdminContentService.getAllTrackers();
    }

    @GetMapping("/xp-trackers/{id}")
    public UserXPTrackerResponse getTrackerById(@PathVariable Long id) {
        return trainingAdminContentService.getTrackerById(id);
    }

    @PostMapping("/xp-trackers")
    @ResponseStatus(HttpStatus.CREATED)
    public UserXPTrackerResponse createTracker(@Valid @RequestBody UserXPTrackerUpsertRequest request) {
        return trainingAdminContentService.createTracker(request);
    }

    @PutMapping("/xp-trackers/{id}")
    public UserXPTrackerResponse updateTracker(@PathVariable Long id, @Valid @RequestBody UserXPTrackerUpsertRequest request) {
        return trainingAdminContentService.updateTracker(id, request);
    }

    @DeleteMapping("/xp-trackers/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTracker(@PathVariable Long id) {
        trainingAdminContentService.deleteTracker(id);
    }

    @GetMapping("/activities")
    public List<DailyActivityResponse> getAllActivities() {
        return trainingAdminContentService.getAllActivities();
    }

    @GetMapping("/activities/{id}")
    public DailyActivityResponse getActivityById(@PathVariable Long id) {
        return trainingAdminContentService.getActivityById(id);
    }

    @PostMapping("/activities")
    @ResponseStatus(HttpStatus.CREATED)
    public DailyActivityResponse createActivity(@Valid @RequestBody DailyActivityUpsertRequest request) {
        return trainingAdminContentService.createActivity(request);
    }

    @PutMapping("/activities/{id}")
    public DailyActivityResponse updateActivity(@PathVariable Long id, @Valid @RequestBody DailyActivityUpsertRequest request) {
        return trainingAdminContentService.updateActivity(id, request);
    }

    @DeleteMapping("/activities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteActivity(@PathVariable Long id) {
        trainingAdminContentService.deleteActivity(id);
    }
}
