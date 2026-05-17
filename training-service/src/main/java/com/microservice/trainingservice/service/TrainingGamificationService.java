package com.microservice.trainingservice.service;

import com.microservice.trainingservice.dto.AwardBadgeRequest;
import com.microservice.trainingservice.dto.DebugBadgeSimulationRequest;
import com.microservice.trainingservice.dto.DebugBadgeSimulationResponse;
import com.microservice.trainingservice.dto.CreateDailyActivityRequest;
import com.microservice.trainingservice.dto.CreateTrainingPathRequest;
import com.microservice.trainingservice.dto.DailyActivityResponse;
import com.microservice.trainingservice.dto.BadgeResponse;
import com.microservice.trainingservice.dto.TrainingModuleResponse;
import com.microservice.trainingservice.dto.TrainingPathResponse;
import com.microservice.trainingservice.dto.UpdateModuleProgressRequest;
import com.microservice.trainingservice.dto.UserBadgeResponse;
import com.microservice.trainingservice.dto.UserXPTrackerResponse;
import com.microservice.trainingservice.event.InterviewSessionCompletedEvent;
import com.microservice.trainingservice.event.TrainingEventPublisher;
import com.microservice.trainingservice.event.TrainingPathCreatedEvent;
import com.microservice.trainingservice.event.TrainingPathUpdatedEvent;
import com.microservice.trainingservice.event.UserBadgeEarnedEvent;
import com.microservice.trainingservice.exception.BusinessException;
import com.microservice.trainingservice.exception.ResourceNotFoundException;
import com.microservice.trainingservice.ai.AiLessonReranker;
import com.microservice.trainingservice.mapper.TrainingMapper;
import com.microservice.trainingservice.model.Badge;
import com.microservice.trainingservice.model.DailyActivity;
import com.microservice.trainingservice.model.LessonDifficulty;
import com.microservice.trainingservice.model.LessonFormat;
import com.microservice.trainingservice.model.LessonProgressStatus;
import com.microservice.trainingservice.model.ModuleStatus;
import com.microservice.trainingservice.model.PathStatus;
import com.microservice.trainingservice.model.TrainingPreferences;
import com.microservice.trainingservice.model.TrainingUserSignal;
import com.microservice.trainingservice.model.TrainingModule;
import com.microservice.trainingservice.model.TrainingModuleLesson;
import com.microservice.trainingservice.model.TrainingPath;
import com.microservice.trainingservice.model.TrainingCategory;
import com.microservice.trainingservice.model.TrainingLesson;
import com.microservice.trainingservice.model.UserBadge;
import com.microservice.trainingservice.model.UserXPTracker;
import com.microservice.trainingservice.repository.BadgeRepository;
import com.microservice.trainingservice.repository.DailyActivityRepository;
import com.microservice.trainingservice.repository.TrainingLessonRepository;
import com.microservice.trainingservice.repository.TrainingModuleRepository;
import com.microservice.trainingservice.repository.TrainingModuleLessonRepository;
import com.microservice.trainingservice.repository.TrainingPathRepository;
import com.microservice.trainingservice.repository.TrainingPreferencesRepository;
import com.microservice.trainingservice.repository.TrainingUserSignalRepository;
import com.microservice.trainingservice.repository.UserBadgeRepository;
import com.microservice.trainingservice.repository.UserXPTrackerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class TrainingGamificationService {

	private static final Pattern NUMBER_PATTERN = Pattern.compile("(\\d[\\d,]*)");

	@Value("${training.debug.badge-simulation-enabled:false}")
	private boolean badgeSimulationEnabled;

	private final TrainingPathRepository trainingPathRepository;
	private final TrainingModuleRepository trainingModuleRepository;
	private final TrainingLessonRepository trainingLessonRepository;
	private final TrainingModuleLessonRepository trainingModuleLessonRepository;
	private final BadgeRepository badgeRepository;
	private final UserBadgeRepository userBadgeRepository;
	private final UserXPTrackerRepository userXPTrackerRepository;
	private final DailyActivityRepository dailyActivityRepository;
	private final TrainingPreferencesRepository trainingPreferencesRepository;
	private final TrainingUserSignalRepository trainingUserSignalRepository;
	private final TrainingMapper trainingMapper;
	private final TrainingEventPublisher eventPublisher;
	private final TrainingPersonalizationRuleEngine personalizationRuleEngine;
	private final AiLessonReranker aiLessonReranker;

	@Transactional(readOnly = true)
	public com.microservice.trainingservice.dto.TrainingPreferencesResponse getPreferencesForUser(String userId) {
		TrainingPreferences preferences = trainingPreferencesRepository.findById(userId)
			.orElseGet(() -> TrainingPreferences.builder().userId(userId).build());
		return toPreferencesResponse(preferences);
	}

	public com.microservice.trainingservice.dto.TrainingPreferencesResponse upsertPreferencesForUser(
		String userId,
		com.microservice.trainingservice.dto.TrainingPreferencesRequest request
	) {
		TrainingPreferences preferences = trainingPreferencesRepository.findById(userId)
			.orElseGet(() -> TrainingPreferences.builder().userId(userId).build());

		preferences.setGoal(normalizeOptional(request.getGoal()));
		preferences.setTargetRole(normalizeOptional(request.getTargetRole()));
		preferences.setSeniority(normalizeOptional(request.getSeniority()));
		preferences.setMinutesPerDay(request.getMinutesPerDay());

		TrainingPreferences saved = trainingPreferencesRepository.saveAndFlush(preferences);
		return toPreferencesResponse(saved);
	}

	public TrainingPathResponse generatePersonalizedPathForUser(String userId) {
		TrainingPreferences preferences = trainingPreferencesRepository.findById(userId).orElse(null);
		TrainingUserSignal signal = trainingUserSignalRepository.findById(userId).orElse(null);
		String preferredLanguage = resolvePreferredLanguage();

		InterviewSessionCompletedEvent pseudoEvent = signal == null ? null : InterviewSessionCompletedEvent.builder()
			.sessionId(signal.getLastSessionId())
			.userId(userId)
			.sessionType(signal.getSessionType())
			.globalScore(signal.getGlobalScore())
			.preparationLevel(signal.getPreparationLevel())
			.totalSessionsCompleted(signal.getTotalSessionsCompleted())
			.generatedAt(signal.getEventGeneratedAt())
			.build();

		AiLessonReranker.UserContext userCtx = new AiLessonReranker.UserContext(
			preferences == null ? null : preferences.getGoal(),
			preferences == null ? null : preferences.getTargetRole(),
			preferences == null ? null : preferences.getSeniority(),
			preferences == null ? null : preferences.getMinutesPerDay(),
			pseudoEvent == null ? null : pseudoEvent.getGlobalScore(),
			pseudoEvent == null ? null : pseudoEvent.getPreparationLevel(),
			pseudoEvent == null ? null : pseudoEvent.getTotalSessionsCompleted(),
			preferredLanguage
		);

		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> basePlans = pseudoEvent == null
			? personalizationRuleEngine.buildDefaultPlan()
			: personalizationRuleEngine.buildPlan(pseudoEvent);
		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> personalizedPlans =
			applyPreferencesToPlans(basePlans, preferences);

		TrainingPath path = getCurrentPathEntityForUser(userId)
			.orElseGet(() -> createPathInternal(
				userId,
				PathStatus.ACTIVE,
				pseudoEvent == null ? 0 : personalizationRuleEngine.recommendXpThreshold(pseudoEvent),
				personalizedPlans
			));

		Integer recommendedThreshold = pseudoEvent == null ? null : personalizationRuleEngine.recommendXpThreshold(pseudoEvent);
		if (recommendedThreshold != null) {
			path.setXpThreshold(recommendedThreshold);
		}
		if (path.getStatus() == null) {
			path.setStatus(PathStatus.ACTIVE);
		}

		boolean hasInProgressModule = path.getModules().stream().anyMatch(m -> m.getStatus() == ModuleStatus.IN_PROGRESS);
		TrainingCategory categoryToUnlock = null;
		if (!hasInProgressModule) {
			for (TrainingPersonalizationRuleEngine.PersonalizedModulePlan plan : personalizedPlans) {
				TrainingModule module = path.getModules().stream()
					.filter(m -> m.getCategory() == plan.category())
					.findFirst()
					.orElse(null);
				if (module == null || module.getStatus() == ModuleStatus.LOCKED) {
					categoryToUnlock = plan.category();
					break;
				}
			}
		}

		// Update only locked modules to avoid losing user progress.
		Set<Long> usedLessonIds = new HashSet<>();
		for (TrainingPersonalizationRuleEngine.PersonalizedModulePlan plan : personalizedPlans) {
			TrainingModule module = path.getModules().stream()
				.filter(m -> m.getCategory() == plan.category())
				.findFirst()
				.orElse(null);
			if (module == null) {
				ModuleStatus status = ModuleStatus.LOCKED;
				java.time.LocalDateTime unlockedAt = null;
				if (categoryToUnlock != null && categoryToUnlock == plan.category()) {
					status = ModuleStatus.IN_PROGRESS;
					unlockedAt = java.time.LocalDateTime.now();
				}
				TrainingModule newModule = TrainingModule.builder()
					.trainingPath(path)
					.category(plan.category())
					.title(plan.title())
					.description(plan.description())
					.lessons(plan.lessons())
					.completedLessons(0)
					.progress(0)
					.xpReward(plan.xpReward())
					.status(status)
					.unlockedAt(unlockedAt)
					.build();
				populateModuleLessonsIfMissing(newModule, plan.lessons(), preferences, usedLessonIds, preferredLanguage, userCtx);
				path.addModule(newModule);
				continue;
			}

			if (module.getStatus() == ModuleStatus.LOCKED) {
				module.setTitle(plan.title());
				module.setDescription(plan.description());
				module.setXpReward(plan.xpReward());
				// Keep existing snapshot to avoid DB constraint issues; only populate if missing.
				populateModuleLessonsIfMissing(module, plan.lessons(), preferences, usedLessonIds, preferredLanguage, userCtx);
				normalizeModuleLessonCounts(module);
				module.updateProgress();
				if (categoryToUnlock != null && categoryToUnlock == plan.category()) {
					module.setStatus(ModuleStatus.IN_PROGRESS);
					if (module.getUnlockedAt() == null) {
						module.setUnlockedAt(java.time.LocalDateTime.now());
					}
				}
			}
		}

		TrainingPath saved = trainingPathRepository.save(path);
		return trainingMapper.trainingPathToResponse(saved);
	}

	public TrainingPathResponse createNewPathForUser(String userId) {
		archiveAllCurrentPaths(userId);
		return generatePersonalizedPathForUser(userId);
	}

	public TrainingPathResponse createTrainingPath(CreateTrainingPathRequest request) {
		if (request.getUserId() == null || request.getUserId().isBlank()) {
			throw new BusinessException("userId is required");
		}
		if (trainingPathRepository.existsByUserIdAndStatusNot(request.getUserId(), PathStatus.ARCHIVED)) {
			throw new BusinessException("Training path already exists for user " + request.getUserId());
		}

		TrainingPath savedPath = createPathInternal(
			request.getUserId(),
			request.getStatus() == null ? PathStatus.ACTIVE : request.getStatus(),
			request.getXpThreshold() == null ? 0 : request.getXpThreshold(),
			personalizationRuleEngine.buildDefaultPlan()
		);

		return trainingMapper.trainingPathToResponse(savedPath);
	}

	@Transactional(readOnly = true)
	public TrainingPathResponse getPathByUserId(String userId) {
		TrainingPath path = getCurrentPathEntityForUser(userId)
			.orElseThrow(() -> new ResourceNotFoundException("Training path not found for user " + userId));
		return trainingMapper.trainingPathToResponse(path);
	}

	@Transactional(readOnly = true)
	public List<TrainingPathResponse> getPathHistoryForUser(String userId) {
		return trainingPathRepository.findAllByUserIdEagerModulesOrderByCreatedAtDesc(userId).stream()
			.map(trainingMapper::trainingPathToResponse)
			.toList();
	}

	private Optional<TrainingPath> getCurrentPathEntityForUser(String userId) {
		List<TrainingPath> paths = trainingPathRepository
			.findNonArchivedByUserIdEagerModulesOrderByCreatedAtDesc(userId, PathStatus.ARCHIVED);
		return paths.isEmpty() ? Optional.empty() : Optional.of(paths.getFirst());
	}

	private void archiveAllCurrentPaths(String userId) {
		List<TrainingPath> paths = trainingPathRepository
			.findNonArchivedByUserIdEagerModulesOrderByCreatedAtDesc(userId, PathStatus.ARCHIVED);
		if (paths.isEmpty()) {
			return;
		}
		for (TrainingPath path : paths) {
			path.setStatus(PathStatus.ARCHIVED);
		}
		trainingPathRepository.saveAll(paths);
	}

	@Transactional(readOnly = true)
	public List<BadgeResponse> getActiveBadges() {
		return badgeRepository.findAllActiveBadges().stream()
			.map(trainingMapper::badgeToResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public List<UserBadgeResponse> getUserBadges(String userId) {
		return userBadgeRepository.findByUserId(userId).stream()
			.map(trainingMapper::userBadgeToResponse)
			.toList();
	}

	@Transactional
	public TrainingModuleResponse updateModuleProgress(String userId, Long pathId, Long moduleId,
													   UpdateModuleProgressRequest request) {
		TrainingPath path = trainingPathRepository.findById(pathId)
			.orElseThrow(() -> new ResourceNotFoundException("Training path not found: " + pathId));

		if (!path.getUserId().equals(userId)) {
			throw new BusinessException("Path does not belong to user " + userId);
		}

		TrainingModule module = trainingModuleRepository.findByIdAndTrainingPathId(moduleId, pathId)
			.orElseThrow(() -> new ResourceNotFoundException("Training module not found: " + moduleId));

		ModuleStatus previousStatus = module.getStatus();

		Integer requestedCompleted = request.getCompletedLessons();
		if (requestedCompleted != null) {
			module.setCompletedLessons(Math.max(0, requestedCompleted));
		}

		int desiredLessonCount = module.getLessons() == null ? 0 : module.getLessons();
		if (desiredLessonCount <= 0 && module.getCompletedLessons() != null && module.getCompletedLessons() > 0) {
			desiredLessonCount = module.getCompletedLessons();
		}
		populateModuleLessonsIfMissing(module, desiredLessonCount, null, null, resolvePreferredLanguage(), null);
		syncModuleLessonCompletionFromCounter(module);

		normalizeModuleLessonCounts(module);
		module.updateProgress();

		if (module.getProgress() >= 100) {
			module.setStatus(ModuleStatus.COMPLETED);
		} else if (module.getProgress() > 0) {
			module.setStatus(ModuleStatus.IN_PROGRESS);
		}

		TrainingModule savedModule = trainingModuleRepository.save(module);

		UserXPTracker tracker = getOrCreateTracker(userId);
		if (previousStatus != ModuleStatus.COMPLETED && savedModule.getStatus() == ModuleStatus.COMPLETED) {
			tracker.addXP(savedModule.getXpReward());
			userXPTrackerRepository.save(tracker);
			unlockNextModuleIfNeeded(pathId);
		}

		evaluateAndAwardAutomaticBadges(
			userId,
			new AutoBadgeContext(
				null,
				null,
				null,
				(int) trainingModuleRepository.findCompletedCountByPathId(pathId),
				tracker.getCurrentStreak(),
				tracker.getTotalXp()
			)
		);

		eventPublisher.publishTrainingPathUpdated(TrainingPathUpdatedEvent.builder()
			.pathId(pathId)
			.userId(userId)
			.moduleId(savedModule.getId())
			.moduleStatus(savedModule.getStatus())
			.moduleProgress(savedModule.getProgress())
			.totalXp(tracker.getTotalXp())
			.updatedAt(LocalDateTime.now())
			.build());

		return trainingMapper.trainingModuleToResponse(savedModule);
	}

	private void populateModuleLessonsIfMissing(
		TrainingModule module,
		int desiredCount,
		TrainingPreferences preferences,
		Set<Long> usedLessonIds,
		String preferredLanguage,
		AiLessonReranker.UserContext userCtx
	) {
		if (module == null) {
			return;
		}
		if (module.getModuleLessons() != null && !module.getModuleLessons().isEmpty()) {
			return;
		}
		if (module.getCategory() == null) {
			return;
		}
		if (desiredCount <= 0) {
			return;
		}

		List<TrainingLesson> candidates = trainingLessonRepository.findActiveByCategoryWithTags(module.getCategory());
		if (candidates.isEmpty()) {
			for (int i = 0; i < desiredCount; i++) {
				module.addModuleLesson(TrainingModuleLesson.builder()
					.module(module)
					.lesson(null)
					.title("Lesson " + (i + 1))
					.format(LessonFormat.TEXT)
					.contentMarkdown(null)
					.videoUrl(null)
					.estimatedMinutes(5)
					.orderIndex(i)
					.status(LessonProgressStatus.PENDING)
					.completedAt(null)
					.build());
			}
		} else {
			List<TrainingLesson> selected = selectLessonsForModule(
				candidates,
				module.getCategory(),
				desiredCount,
				preferences,
				preferredLanguage,
				usedLessonIds,
				userCtx
			);
			int count = selected.size();
			for (int i = 0; i < count; i++) {
				TrainingLesson lesson = selected.get(i);
				module.addModuleLesson(TrainingModuleLesson.builder()
					.module(module)
					.lesson(lesson)
					.title(lesson.getTitle())
					.format(lesson.getFormat())
					.contentMarkdown(lesson.getContentMarkdown())
					.videoUrl(lesson.getVideoUrl())
					.estimatedMinutes(lesson.getEstimatedMinutes() == null ? 5 : lesson.getEstimatedMinutes())
					.orderIndex(i)
					.status(LessonProgressStatus.PENDING)
					.completedAt(null)
					.build());
			}
			desiredCount = count;
		}

		if (module.getLessons() == null || !module.getLessons().equals(desiredCount)) {
			module.setLessons(desiredCount);
		}
		if (module.getCompletedLessons() == null) {
			module.setCompletedLessons(0);
		}
		module.updateProgress();
	}

	private void normalizeModuleLessonCounts(TrainingModule module) {
		if (module == null) {
			return;
		}
		int totalLessons = module.getLessons() == null ? 0 : module.getLessons();
		if (module.getModuleLessons() != null && !module.getModuleLessons().isEmpty()) {
			totalLessons = module.getModuleLessons().size();
		}
		if (totalLessons < 0) {
			totalLessons = 0;
		}
		if (module.getLessons() == null || !module.getLessons().equals(totalLessons)) {
			module.setLessons(totalLessons);
		}
		if (module.getCompletedLessons() == null) {
			module.setCompletedLessons(0);
		} else if (totalLessons > 0 && module.getCompletedLessons() > totalLessons) {
			module.setCompletedLessons(totalLessons);
		}
		if (module.getCompletedLessons() < 0) {
			module.setCompletedLessons(0);
		}
	}

	private String resolvePreferredLanguage() {
		try {
			Locale locale = LocaleContextHolder.getLocale();
			if (locale != null && locale.getLanguage() != null && !locale.getLanguage().isBlank()) {
				return locale.getLanguage().toLowerCase(Locale.ROOT);
			}
		} catch (Exception ignored) {
			// ignore
		}
		return "en";
	}

	private List<TrainingLesson> selectLessonsForModule(
		List<TrainingLesson> candidates,
		TrainingCategory category,
		int desiredCount,
		TrainingPreferences preferences,
		String preferredLanguage,
		Set<Long> usedLessonIds,
		AiLessonReranker.UserContext userCtx
	) {
		if (candidates == null || candidates.isEmpty() || desiredCount <= 0) {
			return List.of();
		}

		Set<String> tokens = buildPreferenceTokens(preferences, category);
		LessonDifficulty desiredDifficulty = inferDesiredDifficulty(preferences);
		String safeLang = (preferredLanguage == null || preferredLanguage.isBlank()) ? "en" : preferredLanguage.toLowerCase(Locale.ROOT);

		record Scored(TrainingLesson lesson, int score) {}
		List<Scored> scored = new ArrayList<>(candidates.size());
		for (TrainingLesson lesson : candidates) {
			if (lesson == null) continue;
			Long lessonId = lesson.getId();
			if (lessonId != null && usedLessonIds != null && usedLessonIds.contains(lessonId)) {
				continue;
			}
			scored.add(new Scored(lesson, scoreLesson(lesson, tokens, desiredDifficulty, safeLang)));
		}

		scored.sort((a, b) -> {
			int byScore = Integer.compare(b.score(), a.score());
			if (byScore != 0) return byScore;
			Long aId = a.lesson().getId();
			Long bId = b.lesson().getId();
			if (aId == null && bId == null) return 0;
			if (aId == null) return 1;
			if (bId == null) return -1;
			return Long.compare(aId, bId);
		});

		java.util.function.Function<List<Scored>, List<TrainingLesson>> pick = (ranked) -> {
			if (ranked == null || ranked.isEmpty()) return List.of();
			int cap = Math.min(ranked.size(), 20);
			List<Scored> top = ranked.subList(0, cap);
			java.util.Map<Long, TrainingLesson> byId = new java.util.HashMap<>();
			List<Long> fallbackOrder = new ArrayList<>(cap);
			java.util.Set<Long> fallbackSeen = new java.util.HashSet<>();
			List<AiLessonReranker.CandidateLesson> aiCandidates = new ArrayList<>(cap);
			for (Scored s : top) {
				TrainingLesson l = s.lesson();
				if (l == null || l.getId() == null) continue;
				byId.put(l.getId(), l);
				if (fallbackSeen.add(l.getId())) {
					fallbackOrder.add(l.getId());
				}
				aiCandidates.add(new AiLessonReranker.CandidateLesson(
					l.getId(),
					l.getTitle(),
					l.getSummary(),
					l.getDifficulty() == null ? null : l.getDifficulty().name(),
					l.getEstimatedMinutes(),
					l.getTags() == null ? List.of() : new ArrayList<>(l.getTags())
				));
			}

			List<Long> orderedIds;
			try {
				orderedIds = (userCtx == null || aiCandidates.isEmpty())
					? fallbackOrder
					: aiLessonReranker.rerank(category, desiredCount, userCtx, aiCandidates);
			} catch (Exception ignored) {
				orderedIds = fallbackOrder;
			}

			List<TrainingLesson> out = new ArrayList<>();
			java.util.Set<Long> usedIds = new java.util.HashSet<>();
			java.util.Set<String> usedTitles = new java.util.HashSet<>();
			for (Long id : orderedIds) {
				if (id == null) continue;
				if (!usedIds.add(id)) continue;
				TrainingLesson l = byId.get(id);
				if (l == null) continue;
				String nt = normalizeTitleKey(l.getTitle());
				if (nt != null && !usedTitles.add(nt)) continue;
				out.add(l);
				if (out.size() >= desiredCount) break;
			}

			// If we still need more, fill from the heuristic order (includes items after the top cap).
			if (out.size() < desiredCount) {
				java.util.Set<Long> used = new java.util.HashSet<>(out.stream().map(TrainingLesson::getId).toList());
				java.util.Set<String> usedT = new java.util.HashSet<>(out.stream().map(x -> normalizeTitleKey(x == null ? null : x.getTitle())).filter(java.util.Objects::nonNull).toList());
				for (Scored s : ranked) {
					TrainingLesson l = s.lesson();
					if (l == null || l.getId() == null) continue;
					if (used.contains(l.getId())) continue;
					String nt = normalizeTitleKey(l.getTitle());
					if (nt != null && usedT.contains(nt)) continue;
					out.add(l);
					usedT.add(nt);
					if (out.size() >= desiredCount) break;
				}
			}

			return out;
		};

		List<TrainingLesson> selected = pick.apply(scored);

		// If we filtered everything out due to usedLessonIds, allow repeats as a fallback.
		if (selected.size() < desiredCount && usedLessonIds != null && !usedLessonIds.isEmpty()) {
			List<Scored> rescored = new ArrayList<>(candidates.size());
			for (TrainingLesson lesson : candidates) {
				if (lesson == null) continue;
				rescored.add(new Scored(lesson, scoreLesson(lesson, tokens, desiredDifficulty, safeLang)));
			}
			rescored.sort((a, b) -> {
				int byScore = Integer.compare(b.score(), a.score());
				if (byScore != 0) return byScore;
				Long aId = a.lesson().getId();
				Long bId = b.lesson().getId();
				if (aId == null && bId == null) return 0;
				if (aId == null) return 1;
				if (bId == null) return -1;
				return Long.compare(aId, bId);
			});
			selected = pick.apply(rescored);
		}

		if (usedLessonIds != null) {
			for (TrainingLesson lesson : selected) {
				if (lesson != null && lesson.getId() != null) {
					usedLessonIds.add(lesson.getId());
				}
			}
		}

		return selected;
	}

	private String normalizeTitleKey(String title) {
		if (title == null) return null;
		String t = title.trim().toLowerCase(java.util.Locale.ROOT);
		if (t.isBlank()) return null;
		t = t.replaceAll("\\s+", " ");
		if (t.length() > 200) t = t.substring(0, 200);
		return t;
	}

	private Set<String> buildPreferenceTokens(TrainingPreferences preferences, TrainingCategory category) {
		Set<String> tokens = new HashSet<>();
		if (category != null) {
			String cat = category.name().toLowerCase(Locale.ROOT).replace('_', ' ');
			for (String t : cat.split("[^a-z0-9]+")) {
				if (!t.isBlank()) tokens.add(t);
			}
		}
		if (preferences == null) {
			return tokens;
		}
		addTokens(tokens, preferences.getGoal());
		addTokens(tokens, preferences.getTargetRole());
		addTokens(tokens, preferences.getSeniority());
		return tokens;
	}

	private void addTokens(Set<String> into, String value) {
		if (into == null || value == null) return;
		String normalized = value.toLowerCase(Locale.ROOT);
		for (String t : normalized.split("[^a-z0-9]+")) {
			if (!t.isBlank()) into.add(t);
		}
	}

	private LessonDifficulty inferDesiredDifficulty(TrainingPreferences preferences) {
		if (preferences == null || preferences.getSeniority() == null) {
			return LessonDifficulty.BEGINNER;
		}
		String s = preferences.getSeniority().trim().toUpperCase(Locale.ROOT);
		if (s.contains("SENIOR")) return LessonDifficulty.ADVANCED;
		if (s.contains("MID")) return LessonDifficulty.INTERMEDIATE;
		if (s.contains("INTER")) return LessonDifficulty.INTERMEDIATE;
		if (s.contains("JUN")) return LessonDifficulty.BEGINNER;
		return LessonDifficulty.BEGINNER;
	}

	private int scoreLesson(
		TrainingLesson lesson,
		Set<String> tokens,
		LessonDifficulty desiredDifficulty,
		String preferredLanguage
	) {
		int score = 0;

		String lang = lesson.getLanguage() == null ? "" : lesson.getLanguage().toLowerCase(Locale.ROOT);
		if (!preferredLanguage.isBlank() && lang.equals(preferredLanguage)) {
			score += 40;
		} else if (lang.equals("en")) {
			score += 20;
		}

		LessonDifficulty diff = lesson.getDifficulty();
		if (diff != null && desiredDifficulty != null) {
			if (diff == desiredDifficulty) {
				score += 30;
			} else if (isAdjacentDifficulty(diff, desiredDifficulty)) {
				score += 15;
			}
		}

		int tagScore = 0;
		if (tokens != null && !tokens.isEmpty() && lesson.getTags() != null) {
			for (String tag : lesson.getTags()) {
				if (tag == null) continue;
				String t = tag.toLowerCase(Locale.ROOT);
				if (tokens.contains(t)) {
					tagScore += 10;
					if (tagScore >= 60) break;
				}
			}
		}
		score += tagScore;

		String title = lesson.getTitle() == null ? "" : lesson.getTitle().toLowerCase(Locale.ROOT);
		if (!title.isBlank() && tokens != null && !tokens.isEmpty()) {
			int titleScore = 0;
			for (String token : tokens) {
				if (token.length() < 3) continue;
				if (title.contains(token)) {
					titleScore += 2;
					if (titleScore >= 20) break;
				}
			}
			score += titleScore;
		}

		return score;
	}

	private boolean isAdjacentDifficulty(LessonDifficulty a, LessonDifficulty b) {
		if (a == null || b == null) return false;
		int ai = difficultyIndex(a);
		int bi = difficultyIndex(b);
		return Math.abs(ai - bi) == 1;
	}

	private int difficultyIndex(LessonDifficulty d) {
		return switch (d) {
			case BEGINNER -> 0;
			case INTERMEDIATE -> 1;
			case ADVANCED -> 2;
		};
	}

	private void syncModuleLessonCompletionFromCounter(TrainingModule module) {
		if (module == null || module.getModuleLessons() == null || module.getModuleLessons().isEmpty()) {
			return;
		}

		List<TrainingModuleLesson> ordered = module.getModuleLessons().stream()
			.sorted(Comparator.comparing(TrainingModuleLesson::getOrderIndex))
			.toList();

		int total = ordered.size();
		int requestedCompleted = module.getCompletedLessons() == null ? 0 : module.getCompletedLessons();
		int clampedCompleted = Math.max(0, Math.min(requestedCompleted, total));
		module.setCompletedLessons(clampedCompleted);
		module.setLessons(total);

		LocalDateTime now = LocalDateTime.now();
		for (int i = 0; i < ordered.size(); i++) {
			TrainingModuleLesson ml = ordered.get(i);
			if (i < clampedCompleted) {
				if (ml.getStatus() != LessonProgressStatus.COMPLETED) {
					ml.setStatus(LessonProgressStatus.COMPLETED);
				}
				if (ml.getCompletedAt() == null) {
					ml.setCompletedAt(now);
				}
			} else {
				ml.setStatus(LessonProgressStatus.PENDING);
				ml.setCompletedAt(null);
			}
		}
	}

	private void unlockNextModuleIfNeeded(Long pathId) {
		if (pathId == null) {
			return;
		}

		boolean hasInProgress = !trainingModuleRepository.findByPathIdAndStatus(pathId, ModuleStatus.IN_PROGRESS).isEmpty();
		if (hasInProgress) {
			return;
		}

		trainingModuleRepository.findByPathIdAndStatus(pathId, ModuleStatus.LOCKED).stream()
			.min(Comparator.comparing(TrainingModule::getId))
			.ifPresent(next -> {
				next.setStatus(ModuleStatus.IN_PROGRESS);
				if (next.getUnlockedAt() == null) {
					next.setUnlockedAt(LocalDateTime.now());
				}
				trainingModuleRepository.save(next);
			});
	}

	public UserBadgeResponse awardBadge(AwardBadgeRequest request) {
		Badge badge = badgeRepository.findById(request.getBadgeId())
			.orElseThrow(() -> new ResourceNotFoundException("Badge not found: " + request.getBadgeId()));

		if (Boolean.FALSE.equals(badge.getIsActive())) {
			throw new BusinessException("Badge is inactive: " + badge.getName());
		}

		if (userBadgeRepository.existsByUserIdAndBadge_Id(request.getUserId(), request.getBadgeId())) {
			throw new BusinessException("Badge already awarded to user " + request.getUserId());
		}

		UserBadge userBadge = UserBadge.builder()
			.userId(request.getUserId())
			.badge(badge)
			.progress(request.getProgress())
			.build();

		UserBadge saved = userBadgeRepository.save(userBadge);

		UserXPTracker tracker = getOrCreateTracker(request.getUserId());
		tracker.addXP(badge.getXpReward());
		userXPTrackerRepository.save(tracker);

		eventPublisher.publishUserBadgeEarned(UserBadgeEarnedEvent.builder()
			.userId(request.getUserId())
			.badgeId(badge.getId())
			.badgeName(badge.getName())
			.category(badge.getCategory())
			.xpReward(badge.getXpReward())
			.earnedAt(saved.getEarnedDate())
			.build());

		return trainingMapper.userBadgeToResponse(saved);
	}

	public UserXPTrackerResponse recordDailyActivity(CreateDailyActivityRequest request) {
		LocalDate date = request.getActivityDate() == null ? LocalDate.now() : request.getActivityDate();

		DailyActivity activity = dailyActivityRepository.findByUserIdAndDate(request.getUserId(), date)
			.orElseGet(() -> DailyActivity.builder()
				.userId(request.getUserId())
				.activityDate(date)
				.xpEarned(0)
				.sessionCompleted(false)
				.goalsCompleted(0)
				.behavioralCount(0)
				.libraryCount(0)
				.quizCount(0)
				.build());

		activity.setXpEarned((activity.getXpEarned() == null ? 0 : activity.getXpEarned()) +
			(request.getXpEarned() == null ? 0 : request.getXpEarned()));
		activity.setSessionCompleted(Boolean.TRUE.equals(activity.getSessionCompleted()) ||
			Boolean.TRUE.equals(request.getSessionCompleted()));
		activity.setGoalsCompleted((activity.getGoalsCompleted() == null ? 0 : activity.getGoalsCompleted()) +
			(request.getGoalsCompleted() == null ? 0 : request.getGoalsCompleted()));
		activity.setBehavioralCount((activity.getBehavioralCount() == null ? 0 : activity.getBehavioralCount()) +
			(request.getBehavioralCount() == null ? 0 : request.getBehavioralCount()));
		activity.setLibraryCount((activity.getLibraryCount() == null ? 0 : activity.getLibraryCount()) +
			(request.getLibraryCount() == null ? 0 : request.getLibraryCount()));
		activity.setQuizCount((activity.getQuizCount() == null ? 0 : activity.getQuizCount()) +
			(request.getQuizCount() == null ? 0 : request.getQuizCount()));

		dailyActivityRepository.save(activity);

		UserXPTracker tracker = getOrCreateTracker(request.getUserId());
		if (request.getXpEarned() != null && request.getXpEarned() > 0) {
			tracker.addXP(request.getXpEarned());
		}

		updateStreak(tracker, date);
		userXPTrackerRepository.save(tracker);

		evaluateAndAwardAutomaticBadges(
			request.getUserId(),
			new AutoBadgeContext(
				null,
				null,
				null,
				countCompletedModulesForUser(request.getUserId()),
				tracker.getCurrentStreak(),
				tracker.getTotalXp()
			)
		);

		return trainingMapper.userXPTrackerToResponse(tracker);
	}

	@Transactional(readOnly = true)
	public DailyActivityResponse getTodayActivity(String userId) {
		return dailyActivityRepository.findByUserIdAndDate(userId, LocalDate.now())
			.map(trainingMapper::dailyActivityToResponse)
			.orElseGet(() -> DailyActivityResponse.builder()
				.userId(userId)
				.activityDate(LocalDate.now())
				.xpEarned(0)
				.sessionCompleted(false)
				.goalsCompleted(0)
				.behavioralCount(0)
				.libraryCount(0)
				.quizCount(0)
				.build());
	}

	@Transactional(readOnly = true)
	public List<UserXPTrackerResponse> getLeaderboard(int topN) {
		int limit = Math.max(1, Math.min(topN, 100));
		return userXPTrackerRepository.findLeaderboard(PageRequest.of(0, limit)).stream()
			.map(trainingMapper::userXPTrackerToResponse)
			.toList();
	}

	public UserXPTrackerResponse getUserXpTracker(String userId) {
		if (userId == null || userId.isBlank()) {
			throw new BusinessException("userId is required");
		}
		UserXPTracker tracker = getOrCreateTracker(userId);
		return trainingMapper.userXPTrackerToResponse(tracker);
	}

	public DebugBadgeSimulationResponse simulateBadgeTriggersForQa(DebugBadgeSimulationRequest request) {
		if (!badgeSimulationEnabled) {
			throw new BusinessException("Badge simulation endpoint is disabled");
		}

		if (request.getUserId() == null || request.getUserId().isBlank()) {
			throw new BusinessException("userId is required");
		}

		TrainingPath path = getCurrentPathEntityForUser(request.getUserId())
			.orElseGet(() -> createPathInternal(
				request.getUserId(),
				PathStatus.ACTIVE,
				200,
				personalizationRuleEngine.buildDefaultPlan()
			));

		Set<Long> beforeBadgeIds = userBadgeRepository.findByUserId(request.getUserId()).stream()
			.map(userBadge -> userBadge.getBadge().getId())
			.collect(java.util.stream.Collectors.toSet());

		int targetXp = request.getTargetXp() == null ? 12000 : Math.max(request.getTargetXp(), 0);
		int targetStreak = request.getTargetStreakDays() == null ? 100 : Math.max(request.getTargetStreakDays(), 0);
		int targetSessions = request.getTargetSessionsCompleted() == null ? 100 : Math.max(request.getTargetSessionsCompleted(), 0);
		double targetScore = request.getTargetGlobalScore() == null ? 100.0 : Math.max(0.0, request.getTargetGlobalScore());
		String preparationLevel = request.getTargetPreparationLevel() == null
			? "MASTER"
			: request.getTargetPreparationLevel();

		UserXPTracker tracker = getOrCreateTracker(request.getUserId());
		if (tracker.getTotalXp() < targetXp) {
			tracker.addXP(targetXp - tracker.getTotalXp());
		}
		tracker.setCurrentStreak(Math.max(tracker.getCurrentStreak(), targetStreak));
		tracker.setLongestStreak(Math.max(tracker.getLongestStreak(), tracker.getCurrentStreak()));
		tracker.setLastActivityDate(LocalDate.now());
		tracker = userXPTrackerRepository.save(tracker);

		List<TrainingModule> modules = trainingModuleRepository.findByPathIdOrdered(path.getId());
		for (TrainingModule module : modules) {
			if (module.getStatus() != ModuleStatus.COMPLETED) {
				module.setCompletedLessons(module.getLessons());
				module.setProgress(100);
				module.setStatus(ModuleStatus.COMPLETED);
				trainingModuleRepository.save(module);
			}
		}

		int completedModules = (int) trainingModuleRepository.findCompletedCountByPathId(path.getId());
		evaluateAndAwardAutomaticBadges(
			request.getUserId(),
			new AutoBadgeContext(
				targetSessions,
				targetScore,
				preparationLevel,
				completedModules,
				tracker.getCurrentStreak(),
				tracker.getTotalXp()
			)
		);

		List<UserBadge> allUserBadges = userBadgeRepository.findByUserId(request.getUserId());
		List<String> newlyAwarded = allUserBadges.stream()
			.filter(userBadge -> !beforeBadgeIds.contains(userBadge.getBadge().getId()))
			.map(userBadge -> userBadge.getBadge().getName())
			.toList();

		List<String> allBadgeNames = allUserBadges.stream()
			.map(userBadge -> userBadge.getBadge().getName())
			.toList();

		tracker = getOrCreateTracker(request.getUserId());

		return DebugBadgeSimulationResponse.builder()
			.userId(request.getUserId())
			.pathId(path.getId())
			.completedModules(completedModules)
			.totalXp(tracker.getTotalXp())
			.currentStreak(tracker.getCurrentStreak())
			.totalBadgesAwarded(allBadgeNames.size())
			.newlyAwardedBadges(newlyAwarded)
			.allAwardedBadges(allBadgeNames)
			.build();
	}

	public void processInterviewCompleted(InterviewSessionCompletedEvent event) {
		upsertLastUserSignal(event);
		TrainingPath path = getCurrentPathEntityForUser(event.getUserId())
			.orElseGet(() -> createPersonalizedPathFromInterview(event));

		int interviewXp = Math.max(20, event.getGlobalScore() == null ? 20 : (int) Math.round(event.getGlobalScore() * 2));
		recordDailyActivity(CreateDailyActivityRequest.builder()
			.userId(event.getUserId())
			.activityDate(LocalDate.now())
			.xpEarned(interviewXp)
			.sessionCompleted(true)
			.goalsCompleted(1)
			.build());

		UserXPTracker tracker = getOrCreateTracker(event.getUserId());
		evaluateAndAwardAutomaticBadges(
			event.getUserId(),
			new AutoBadgeContext(
				event.getTotalSessionsCompleted(),
				event.getGlobalScore(),
				event.getPreparationLevel(),
				countCompletedModulesForUser(event.getUserId()),
				tracker.getCurrentStreak(),
				tracker.getTotalXp()
			)
		);

		eventPublisher.publishTrainingPathUpdated(TrainingPathUpdatedEvent.builder()
			.pathId(path.getId())
			.userId(path.getUserId())
			.moduleId(null)
			.moduleStatus(null)
			.moduleProgress(null)
			.totalXp(getOrCreateTracker(path.getUserId()).getTotalXp())
			.updatedAt(LocalDateTime.now())
			.build());
	}

	private void upsertLastUserSignal(InterviewSessionCompletedEvent event) {
		if (event == null || event.getUserId() == null || event.getUserId().isBlank()) {
			return;
		}

		TrainingUserSignal signal = trainingUserSignalRepository.findById(event.getUserId())
			.orElseGet(() -> TrainingUserSignal.builder().userId(event.getUserId()).build());
		signal.setLastSessionId(event.getSessionId());
		signal.setSessionType(normalizeOptional(event.getSessionType()));
		signal.setGlobalScore(event.getGlobalScore());
		signal.setPreparationLevel(normalizeOptional(event.getPreparationLevel()));
		signal.setTotalSessionsCompleted(event.getTotalSessionsCompleted());
		signal.setEventGeneratedAt(normalizeOptional(event.getGeneratedAt()));
		trainingUserSignalRepository.save(signal);
	}

	private com.microservice.trainingservice.dto.TrainingPreferencesResponse toPreferencesResponse(TrainingPreferences preferences) {
		return com.microservice.trainingservice.dto.TrainingPreferencesResponse.builder()
			.userId(preferences.getUserId())
			.goal(preferences.getGoal())
			.targetRole(preferences.getTargetRole())
			.seniority(preferences.getSeniority())
			.minutesPerDay(preferences.getMinutesPerDay())
			.updatedAt(preferences.getUpdatedAt())
			.build();
	}

	private String normalizeOptional(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isBlank() ? null : trimmed;
	}

	private List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> applyPreferencesToPlans(
		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> basePlans,
		TrainingPreferences preferences
	) {
		if (preferences == null) {
			return basePlans;
		}

		java.util.Map<TrainingCategory, Integer> boost = new java.util.EnumMap<>(TrainingCategory.class);
		String goal = preferences.getGoal() == null ? "" : preferences.getGoal().trim().toUpperCase(Locale.ROOT);
		switch (goal) {
			case "TECHNICAL" -> {
				boost.put(TrainingCategory.CONTENT_PREP, 2);
				boost.put(TrainingCategory.INDUSTRY_SPECIFIC, 2);
			}
			case "BEHAVIORAL" -> {
				boost.put(TrainingCategory.COMMUNICATION, 2);
				boost.put(TrainingCategory.BODY_LANGUAGE, 1);
			}
			case "CONFIDENCE" -> {
				boost.put(TrainingCategory.STRESS_MANAGEMENT, 2);
				boost.put(TrainingCategory.COMMUNICATION, 1);
			}
			default -> {
				// no-op
			}
		}

		int minutes = preferences.getMinutesPerDay() == null ? 0 : preferences.getMinutesPerDay();
		int lessonsDelta = 0;
		if (minutes >= 90) {
			lessonsDelta = 2;
		} else if (minutes >= 45) {
			lessonsDelta = 1;
		} else if (minutes > 0 && minutes <= 15) {
			lessonsDelta = -1;
		}

		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> enriched = new ArrayList<>();
		for (int i = 0; i < basePlans.size(); i++) {
			TrainingPersonalizationRuleEngine.PersonalizedModulePlan plan = basePlans.get(i);
			int lessons = Math.max(3, plan.lessons() + lessonsDelta);
			int xpReward = Math.max(20, plan.xpReward() + lessonsDelta * 10);
			enriched.add(new TrainingPersonalizationRuleEngine.PersonalizedModulePlan(
				plan.category(),
				plan.title(),
				plan.description(),
				lessons,
				xpReward,
				false
			));
		}

		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> ordered = new ArrayList<>(enriched);
		ordered.sort(java.util.Comparator
			.comparingInt((TrainingPersonalizationRuleEngine.PersonalizedModulePlan p) -> boost.getOrDefault(p.category(), 0))
			.reversed()
			.thenComparingInt(p -> indexOfCategory(enriched, p.category()))
		);

		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> finalPlans = new ArrayList<>();
		for (int i = 0; i < ordered.size(); i++) {
			TrainingPersonalizationRuleEngine.PersonalizedModulePlan p = ordered.get(i);
			finalPlans.add(new TrainingPersonalizationRuleEngine.PersonalizedModulePlan(
				p.category(),
				p.title(),
				p.description(),
				p.lessons(),
				p.xpReward(),
				i == 0
			));
		}

		return finalPlans;
	}

	private int indexOfCategory(List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> plans, TrainingCategory category) {
		for (int i = 0; i < plans.size(); i++) {
			if (plans.get(i).category() == category) {
				return i;
			}
		}
		return Integer.MAX_VALUE;
	}

	private void evaluateAndAwardAutomaticBadges(String userId, AutoBadgeContext context) {
		if (userId == null || userId.isBlank()) {
			return;
		}

		UserXPTracker tracker = getOrCreateTracker(userId);
		for (Badge badge : badgeRepository.findAllActiveBadges()) {
			if (shouldAutoAwardBadge(badge, context, tracker)
				&& !userBadgeRepository.existsByUserIdAndBadge_Id(userId, badge.getId())) {
				autoAwardBadge(userId, badge, tracker);
			}
		}
	}

	private boolean shouldAutoAwardBadge(Badge badge, AutoBadgeContext context, UserXPTracker tracker) {
		String signature = ((badge.getName() == null ? "" : badge.getName()) + " "
			+ (badge.getDescription() == null ? "" : badge.getDescription())).toLowerCase(Locale.ROOT);

		if (signature.contains("mock interview")) {
			Integer sessions = context.totalSessionsCompleted();
			int required = extractFirstNumber(signature, 1);
			return sessions != null && sessions >= required;
		}

		if (signature.contains("learning streak")) {
			int required = extractFirstNumber(signature, 1);
			return tracker.getCurrentStreak() >= required;
		}

		if (signature.contains("100%") || signature.contains("perfect score")) {
			Double score = context.globalScore();
			return score != null && score >= 100.0;
		}

		if (signature.contains("master preparation level")) {
			String level = context.preparationLevel();
			return (level != null && level.toUpperCase(Locale.ROOT).contains("MASTER"))
				|| tracker.getCurrentLevel() >= 10;
		}

		if (signature.contains("improve your score by 50")) {
			return false;
		}

		if (signature.contains("xp")) {
			int required = extractFirstNumber(signature, Integer.MAX_VALUE);
			return context.totalXp() >= required;
		}

		if (signature.contains("library resources") || signature.contains("quizzes")) {
			int required = extractFirstNumber(signature, Integer.MAX_VALUE);
			return context.completedModules() >= required;
		}

		if (signature.contains("community") || signature.contains("mentoring")) {
			return false;
		}

		return false;
	}

	private int extractFirstNumber(String text, int fallback) {
		Matcher matcher = NUMBER_PATTERN.matcher(text);
		if (!matcher.find()) {
			return fallback;
		}

		String sanitized = matcher.group(1).replace(",", "");
		try {
			return Integer.parseInt(sanitized);
		} catch (NumberFormatException ignored) {
			return fallback;
		}
	}

	private void autoAwardBadge(String userId, Badge badge, UserXPTracker tracker) {
		UserBadge saved = userBadgeRepository.save(UserBadge.builder()
			.userId(userId)
			.badge(badge)
			.progress(100)
			.build());

		tracker.addXP(badge.getXpReward());
		userXPTrackerRepository.save(tracker);

		eventPublisher.publishUserBadgeEarned(UserBadgeEarnedEvent.builder()
			.userId(userId)
			.badgeId(badge.getId())
			.badgeName(badge.getName())
			.category(badge.getCategory())
			.xpReward(badge.getXpReward())
			.earnedAt(saved.getEarnedDate())
			.build());
	}

	private int countCompletedModulesForUser(String userId) {
		return getCurrentPathEntityForUser(userId)
			.map(path -> (int) trainingModuleRepository.findCompletedCountByPathId(path.getId()))
			.orElse(0);
	}

	private record AutoBadgeContext(
		Integer totalSessionsCompleted,
		Double globalScore,
		String preparationLevel,
		int completedModules,
		int currentStreak,
		int totalXp
	) {
	}

	private TrainingPath createPersonalizedPathFromInterview(InterviewSessionCompletedEvent event) {
		return createPathInternal(
			event.getUserId(),
			PathStatus.ACTIVE,
			personalizationRuleEngine.recommendXpThreshold(event),
			personalizationRuleEngine.buildPlan(event)
		);
	}

	private TrainingPath createPathInternal(
		String userId,
		PathStatus status,
		Integer xpThreshold,
		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> modulePlans
	) {
		TrainingPreferences preferences = trainingPreferencesRepository.findById(userId).orElse(null);
		String preferredLanguage = resolvePreferredLanguage();
		Set<Long> usedLessonIds = new HashSet<>();
		AiLessonReranker.UserContext userCtx = new AiLessonReranker.UserContext(
			preferences == null ? null : preferences.getGoal(),
			preferences == null ? null : preferences.getTargetRole(),
			preferences == null ? null : preferences.getSeniority(),
			preferences == null ? null : preferences.getMinutesPerDay(),
			null,
			null,
			null,
			preferredLanguage
		);

		TrainingPath path = TrainingPath.builder()
			.userId(userId)
			.xpThreshold(xpThreshold)
			.status(status)
			.modules(new ArrayList<>())
			.build();

		List<TrainingModule> defaultModules = buildModulesFromPlans(path, modulePlans);
		defaultModules.forEach(path::addModule);
		defaultModules.forEach(m -> populateModuleLessonsIfMissing(
			m,
			m.getLessons() == null ? 0 : m.getLessons(),
			preferences,
			usedLessonIds,
			preferredLanguage,
			userCtx
		));

		TrainingPath savedPath = trainingPathRepository.save(path);
		// Ensure snapshots are persisted (cascade from module -> moduleLessons).
		for (TrainingModule module : defaultModules) {
			if (module.getModuleLessons() != null && !module.getModuleLessons().isEmpty()) {
				trainingModuleLessonRepository.saveAll(module.getModuleLessons());
			}
		}
		getOrCreateTracker(userId);

		eventPublisher.publishTrainingPathCreated(TrainingPathCreatedEvent.builder()
			.pathId(savedPath.getId())
			.userId(savedPath.getUserId())
			.status(savedPath.getStatus())
			.createdAt(savedPath.getCreatedAt())
			.build());

		return savedPath;
	}

	private List<TrainingModule> buildModulesFromPlans(
		TrainingPath path,
		List<TrainingPersonalizationRuleEngine.PersonalizedModulePlan> modulePlans
	) {
		List<TrainingModule> modules = new ArrayList<>();
		for (TrainingPersonalizationRuleEngine.PersonalizedModulePlan plan : modulePlans) {
			ModuleStatus status = plan.unlocked() ? ModuleStatus.IN_PROGRESS : ModuleStatus.LOCKED;
			LocalDateTime unlockedAt = plan.unlocked() ? LocalDateTime.now() : null;

			modules.add(TrainingModule.builder()
				.trainingPath(path)
				.category(plan.category())
				.title(plan.title())
				.description(plan.description())
				.lessons(plan.lessons())
				.completedLessons(0)
				.progress(0)
				.xpReward(plan.xpReward())
				.status(status)
				.unlockedAt(unlockedAt)
				.build());
		}
		return modules;
	}

	private UserXPTracker getOrCreateTracker(String userId) {
		return userXPTrackerRepository.findByUserId(userId)
			.orElseGet(() -> userXPTrackerRepository.save(UserXPTracker.builder()
				.userId(userId)
				.totalXp(0)
				.currentLevel(1)
				.xpToNextLevel(1000)
				.currentStreak(0)
				.longestStreak(0)
				.lastActivityDate(null)
				.build()));
	}

	private void updateStreak(UserXPTracker tracker, LocalDate activityDate) {
		LocalDate lastDate = tracker.getLastActivityDate();
		if (lastDate == null) {
			tracker.setCurrentStreak(1);
			tracker.setLongestStreak(Math.max(1, tracker.getLongestStreak()));
			tracker.setLastActivityDate(activityDate);
			return;
		}

		if (activityDate.equals(lastDate)) {
			return;
		}

		if (activityDate.equals(lastDate.plusDays(1))) {
			tracker.incrementStreak();
		} else if (activityDate.isAfter(lastDate.plusDays(1))) {
			tracker.setCurrentStreak(1);
		}

		tracker.setLongestStreak(Math.max(tracker.getLongestStreak(), tracker.getCurrentStreak()));
		tracker.setLastActivityDate(activityDate);
	}
}
