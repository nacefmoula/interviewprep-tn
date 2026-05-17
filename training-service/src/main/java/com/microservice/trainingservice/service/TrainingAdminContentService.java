package com.microservice.trainingservice.service;

import com.microservice.trainingservice.ai.AiMissingLessonGenerationService;
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
import com.microservice.trainingservice.exception.BusinessException;
import com.microservice.trainingservice.exception.ResourceNotFoundException;
import com.microservice.trainingservice.mapper.TrainingMapper;
import com.microservice.trainingservice.model.Badge;
import com.microservice.trainingservice.model.DailyActivity;
import com.microservice.trainingservice.model.LessonFormat;
import com.microservice.trainingservice.model.ModuleStatus;
import com.microservice.trainingservice.model.PathStatus;
import com.microservice.trainingservice.model.TrainingLesson;
import com.microservice.trainingservice.model.TrainingModule;
import com.microservice.trainingservice.model.TrainingPath;
import com.microservice.trainingservice.model.UserBadge;
import com.microservice.trainingservice.model.UserXPTracker;
import com.microservice.trainingservice.repository.BadgeRepository;
import com.microservice.trainingservice.repository.DailyActivityRepository;
import com.microservice.trainingservice.repository.TrainingLessonRepository;
import com.microservice.trainingservice.repository.TrainingModuleRepository;
import com.microservice.trainingservice.repository.TrainingPathRepository;
import com.microservice.trainingservice.repository.UserBadgeRepository;
import com.microservice.trainingservice.repository.UserXPTrackerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TrainingAdminContentService {

    private final BadgeRepository badgeRepository;
    private final TrainingModuleRepository trainingModuleRepository;
    private final TrainingPathRepository trainingPathRepository;
    private final TrainingLessonRepository trainingLessonRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserXPTrackerRepository userXPTrackerRepository;
    private final DailyActivityRepository dailyActivityRepository;
    private final TrainingMapper trainingMapper;
    private final AiMissingLessonGenerationService aiMissingLessonGenerationService;

    @Transactional(readOnly = true)
    public List<TrainingLessonResponse> getAllLessons(Boolean active) {
        List<TrainingLesson> lessons = (active == null)
            ? trainingLessonRepository.findAll()
            : (active ? trainingLessonRepository.findByActiveTrueOrderByIdAsc() : trainingLessonRepository.findAll());
        return lessons.stream().map(trainingMapper::trainingLessonToResponse).toList();
    }

    @Transactional(readOnly = true)
    public TrainingLessonResponse getLessonById(Long id) {
        TrainingLesson lesson = trainingLessonRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training lesson not found: " + id));
        return trainingMapper.trainingLessonToResponse(lesson);
    }

    public TrainingLessonResponse createLesson(TrainingLessonUpsertRequest request) {
        TrainingLesson lesson = new TrainingLesson();
        applyLessonRequest(lesson, request);
        return trainingMapper.trainingLessonToResponse(trainingLessonRepository.save(lesson));
    }

    public TrainingLessonResponse updateLesson(Long id, TrainingLessonUpsertRequest request) {
        TrainingLesson lesson = trainingLessonRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training lesson not found: " + id));
        applyLessonRequest(lesson, request);
        return trainingMapper.trainingLessonToResponse(trainingLessonRepository.save(lesson));
    }

    public void deleteLesson(Long id) {
        TrainingLesson lesson = trainingLessonRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training lesson not found: " + id));
        lesson.setActive(false);
        trainingLessonRepository.save(lesson);
    }

    public GenerateMissingLessonsResponse generateMissingDraftLessons(GenerateMissingLessonsRequest request) {
        return aiMissingLessonGenerationService.generateMissingDraftLessons(request);
    }

    @Transactional(readOnly = true)
    public List<TrainingPathResponse> getAllPaths() {
        return trainingPathRepository.findAll().stream().map(trainingMapper::trainingPathToResponse).toList();
    }

    @Transactional(readOnly = true)
    public TrainingPathResponse getPathById(Long id) {
        TrainingPath path = trainingPathRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training path not found: " + id));
        return trainingMapper.trainingPathToResponse(path);
    }

    public TrainingPathResponse createPath(TrainingPathUpsertRequest request) {
        if (trainingPathRepository.existsByUserIdAndStatusNot(request.getUserId(), PathStatus.ARCHIVED)) {
            throw new BusinessException("Non-archived training path already exists for user " + request.getUserId());
        }

        TrainingPath path = TrainingPath.builder()
            .userId(request.getUserId())
            .status(request.getStatus())
            .xpThreshold(request.getXpThreshold())
            .build();

        return trainingMapper.trainingPathToResponse(trainingPathRepository.save(path));
    }

    public TrainingPathResponse updatePath(Long id, TrainingPathUpsertRequest request) {
        TrainingPath path = trainingPathRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training path not found: " + id));

        String targetUserId = request.getUserId();
        if (targetUserId == null || targetUserId.isBlank()) {
            throw new BusinessException("userId is required");
        }

        PathStatus targetStatus = request.getStatus() == null ? path.getStatus() : request.getStatus();
        if (targetStatus != PathStatus.ARCHIVED
            && trainingPathRepository.existsByUserIdAndStatusNotAndIdNot(targetUserId, PathStatus.ARCHIVED, id)) {
            throw new BusinessException("Non-archived training path already exists for user " + targetUserId);
        }

        path.setUserId(targetUserId);
        if (request.getStatus() != null) {
            path.setStatus(request.getStatus());
        }
        path.setXpThreshold(request.getXpThreshold());

        return trainingMapper.trainingPathToResponse(trainingPathRepository.save(path));
    }

    public void deletePath(Long id) {
        if (!trainingPathRepository.existsById(id)) {
            throw new ResourceNotFoundException("Training path not found: " + id);
        }
        trainingPathRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<BadgeResponse> getAllBadges() {
        return badgeRepository.findAll().stream().map(trainingMapper::badgeToResponse).toList();
    }

    @Transactional(readOnly = true)
    public BadgeResponse getBadgeById(Long id) {
        Badge badge = badgeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Badge not found: " + id));
        return trainingMapper.badgeToResponse(badge);
    }

    public BadgeResponse createBadge(BadgeUpsertRequest request) {
        Badge badge = new Badge();
        applyBadgeRequest(badge, request);
        return trainingMapper.badgeToResponse(badgeRepository.save(badge));
    }

    public BadgeResponse updateBadge(Long id, BadgeUpsertRequest request) {
        Badge badge = badgeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Badge not found: " + id));
        applyBadgeRequest(badge, request);
        return trainingMapper.badgeToResponse(badgeRepository.save(badge));
    }

    public void deleteBadge(Long id) {
        if (!badgeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Badge not found: " + id);
        }
        badgeRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<TrainingModuleResponse> getAllModules() {
        return trainingModuleRepository.findAll().stream().map(trainingMapper::trainingModuleToResponse).toList();
    }

    @Transactional(readOnly = true)
    public TrainingModuleResponse getModuleById(Long id) {
        TrainingModule module = trainingModuleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training module not found: " + id));
        return trainingMapper.trainingModuleToResponse(module);
    }

    public TrainingModuleResponse createModule(TrainingModuleUpsertRequest request) {
        TrainingModule module = new TrainingModule();
        applyModuleRequest(module, request);
        return trainingMapper.trainingModuleToResponse(trainingModuleRepository.save(module));
    }

    public TrainingModuleResponse updateModule(Long id, TrainingModuleUpsertRequest request) {
        TrainingModule module = trainingModuleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training module not found: " + id));
        applyModuleRequest(module, request);
        return trainingMapper.trainingModuleToResponse(trainingModuleRepository.save(module));
    }

    public void deleteModule(Long id) {
        if (!trainingModuleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Training module not found: " + id);
        }
        trainingModuleRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserBadgeResponse> getAllUserBadges() {
        return userBadgeRepository.findAll().stream().map(trainingMapper::userBadgeToResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserBadgeResponse getUserBadgeById(Long id) {
        UserBadge userBadge = userBadgeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User badge not found: " + id));
        return trainingMapper.userBadgeToResponse(userBadge);
    }

    public UserBadgeResponse createUserBadge(UserBadgeUpsertRequest request) {
        Badge badge = badgeRepository.findById(request.getBadgeId())
            .orElseThrow(() -> new ResourceNotFoundException("Badge not found: " + request.getBadgeId()));

        if (userBadgeRepository.existsByUserIdAndBadge_Id(request.getUserId(), request.getBadgeId())) {
            throw new BusinessException("User badge already exists for user and badge");
        }

        UserBadge userBadge = UserBadge.builder()
            .userId(request.getUserId())
            .badge(badge)
            .progress(request.getProgress())
            .build();

        return trainingMapper.userBadgeToResponse(userBadgeRepository.save(userBadge));
    }

    public UserBadgeResponse updateUserBadge(Long id, UserBadgeUpsertRequest request) {
        UserBadge userBadge = userBadgeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User badge not found: " + id));

        Badge badge = badgeRepository.findById(request.getBadgeId())
            .orElseThrow(() -> new ResourceNotFoundException("Badge not found: " + request.getBadgeId()));

        userBadgeRepository.findByUserIdAndBadgeId(request.getUserId(), request.getBadgeId())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new BusinessException("User badge already exists for user and badge");
            });

        userBadge.setUserId(request.getUserId());
        userBadge.setBadge(badge);
        userBadge.setProgress(request.getProgress());

        return trainingMapper.userBadgeToResponse(userBadgeRepository.save(userBadge));
    }

    public void deleteUserBadge(Long id) {
        if (!userBadgeRepository.existsById(id)) {
            throw new ResourceNotFoundException("User badge not found: " + id);
        }
        userBadgeRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserXPTrackerResponse> getAllTrackers() {
        return userXPTrackerRepository.findAll().stream().map(trainingMapper::userXPTrackerToResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserXPTrackerResponse getTrackerById(Long id) {
        UserXPTracker tracker = userXPTrackerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User XP tracker not found: " + id));
        return trainingMapper.userXPTrackerToResponse(tracker);
    }

    public UserXPTrackerResponse createTracker(UserXPTrackerUpsertRequest request) {
        if (userXPTrackerRepository.findByUserId(request.getUserId()).isPresent()) {
            throw new BusinessException("User XP tracker already exists for user " + request.getUserId());
        }

        UserXPTracker tracker = UserXPTracker.builder()
            .userId(request.getUserId())
            .totalXp(request.getTotalXp())
            .currentLevel(request.getCurrentLevel())
            .xpToNextLevel(request.getXpToNextLevel())
            .currentStreak(request.getCurrentStreak())
            .longestStreak(request.getLongestStreak())
            .lastActivityDate(request.getLastActivityDate())
            .build();

        return trainingMapper.userXPTrackerToResponse(userXPTrackerRepository.save(tracker));
    }

    public UserXPTrackerResponse updateTracker(Long id, UserXPTrackerUpsertRequest request) {
        UserXPTracker tracker = userXPTrackerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User XP tracker not found: " + id));

        userXPTrackerRepository.findByUserId(request.getUserId())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new BusinessException("User XP tracker already exists for user " + request.getUserId());
            });

        tracker.setUserId(request.getUserId());
        tracker.setTotalXp(request.getTotalXp());
        tracker.setCurrentLevel(request.getCurrentLevel());
        tracker.setXpToNextLevel(request.getXpToNextLevel());
        tracker.setCurrentStreak(request.getCurrentStreak());
        tracker.setLongestStreak(request.getLongestStreak());
        tracker.setLastActivityDate(request.getLastActivityDate());

        return trainingMapper.userXPTrackerToResponse(userXPTrackerRepository.save(tracker));
    }

    public void deleteTracker(Long id) {
        if (!userXPTrackerRepository.existsById(id)) {
            throw new ResourceNotFoundException("User XP tracker not found: " + id);
        }
        userXPTrackerRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<DailyActivityResponse> getAllActivities() {
        return dailyActivityRepository.findAll().stream().map(trainingMapper::dailyActivityToResponse).toList();
    }

    @Transactional(readOnly = true)
    public DailyActivityResponse getActivityById(Long id) {
        DailyActivity dailyActivity = dailyActivityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Daily activity not found: " + id));
        return trainingMapper.dailyActivityToResponse(dailyActivity);
    }

    public DailyActivityResponse createActivity(DailyActivityUpsertRequest request) {
        if (dailyActivityRepository.existsByUserIdAndActivityDate(request.getUserId(), request.getActivityDate())) {
            throw new BusinessException("Daily activity already exists for user/date");
        }

        DailyActivity dailyActivity = DailyActivity.builder()
            .userId(request.getUserId())
            .activityDate(request.getActivityDate())
            .xpEarned(request.getXpEarned())
            .sessionCompleted(request.getSessionCompleted())
            .goalsCompleted(request.getGoalsCompleted())
            .behavioralCount(request.getBehavioralCount())
            .libraryCount(request.getLibraryCount())
            .quizCount(request.getQuizCount())
            .build();

        return trainingMapper.dailyActivityToResponse(dailyActivityRepository.save(dailyActivity));
    }

    public DailyActivityResponse updateActivity(Long id, DailyActivityUpsertRequest request) {
        DailyActivity dailyActivity = dailyActivityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Daily activity not found: " + id));

        dailyActivityRepository.findByUserIdAndDate(request.getUserId(), request.getActivityDate())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new BusinessException("Daily activity already exists for user/date");
            });

        dailyActivity.setUserId(request.getUserId());
        dailyActivity.setActivityDate(request.getActivityDate());
        dailyActivity.setXpEarned(request.getXpEarned());
        dailyActivity.setSessionCompleted(request.getSessionCompleted());
        dailyActivity.setGoalsCompleted(request.getGoalsCompleted());
        dailyActivity.setBehavioralCount(request.getBehavioralCount());
        dailyActivity.setLibraryCount(request.getLibraryCount());
        dailyActivity.setQuizCount(request.getQuizCount());

        return trainingMapper.dailyActivityToResponse(dailyActivityRepository.save(dailyActivity));
    }

    public void deleteActivity(Long id) {
        if (!dailyActivityRepository.existsById(id)) {
            throw new ResourceNotFoundException("Daily activity not found: " + id);
        }
        dailyActivityRepository.deleteById(id);
    }

    private void applyBadgeRequest(Badge badge, BadgeUpsertRequest request) {
        badge.setName(request.getName());
        badge.setDescription(request.getDescription());
        badge.setIcon(request.getIcon());
        badge.setCategory(request.getCategory());
        badge.setXpReward(request.getXpReward());
        badge.setCriteriaJson(request.getCriteriaJson());
        badge.setIsActive(request.getIsActive());
    }

    private void applyModuleRequest(TrainingModule module, TrainingModuleUpsertRequest request) {
        TrainingPath path = trainingPathRepository.findById(request.getPathId())
            .orElseThrow(() -> new ResourceNotFoundException("Training path not found: " + request.getPathId()));

        if (request.getCompletedLessons() > request.getLessons()) {
            throw new BusinessException("completedLessons cannot exceed lessons");
        }

        module.setTrainingPath(path);
        module.setCategory(request.getCategory());
        module.setTitle(request.getTitle());
        module.setDescription(request.getDescription());
        module.setLessons(request.getLessons());
        module.setCompletedLessons(request.getCompletedLessons());
        module.setXpReward(request.getXpReward());
        module.setUnlockedAt(request.getUnlockedAt());

        int computedProgress = (request.getProgress() == null)
            ? (request.getLessons() == 0 ? 0 : Math.min(100, (request.getCompletedLessons() * 100) / request.getLessons()))
            : request.getProgress();

        ModuleStatus effectiveStatus = request.getStatus();
        if (computedProgress >= 100) {
            effectiveStatus = ModuleStatus.COMPLETED;
        } else if (computedProgress > 0 && effectiveStatus == ModuleStatus.LOCKED) {
            effectiveStatus = ModuleStatus.IN_PROGRESS;
        }

        module.setProgress(computedProgress);
        module.setStatus(effectiveStatus);
    }

    private void applyLessonRequest(TrainingLesson lesson, TrainingLessonUpsertRequest request) {
        if (request.getCategory() == null) {
            throw new BusinessException("category is required");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BusinessException("title is required");
        }
        LessonFormat format = request.getFormat();
        if (format == null) {
            throw new BusinessException("format is required");
        }
        if (format == LessonFormat.TEXT && (request.getContentMarkdown() == null || request.getContentMarkdown().isBlank())) {
            throw new BusinessException("contentMarkdown is required for TEXT lessons");
        }
        if (format == LessonFormat.VIDEO && (request.getVideoUrl() == null || request.getVideoUrl().isBlank())) {
            throw new BusinessException("videoUrl is required for VIDEO lessons");
        }

        lesson.setCategory(request.getCategory());
        lesson.setTitle(request.getTitle());
        lesson.setFormat(format);
        lesson.setSummary(request.getSummary());
        lesson.setContentMarkdown(request.getContentMarkdown());
        lesson.setVideoUrl(request.getVideoUrl());
        lesson.setEstimatedMinutes(request.getEstimatedMinutes() == null ? 5 : Math.max(0, request.getEstimatedMinutes()));
        lesson.setDifficulty(request.getDifficulty() == null ? lesson.getDifficulty() : request.getDifficulty());
        if (lesson.getDifficulty() == null) {
            lesson.setDifficulty(com.microservice.trainingservice.model.LessonDifficulty.BEGINNER);
        }
        lesson.setLanguage(request.getLanguage() == null || request.getLanguage().isBlank() ? "en" : request.getLanguage());
        lesson.setActive(request.getActive() == null ? true : request.getActive());

        lesson.getTags().clear();
        if (request.getTags() != null) {
            request.getTags().stream()
                .filter(t -> t != null && !t.isBlank())
                .map(String::trim)
                .forEach(lesson.getTags()::add);
        }
    }
}
