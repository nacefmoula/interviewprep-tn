export interface TrainingPathResponse {
    id: number;
    userId: string;
    status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
    xpThreshold: number;
    createdAt: string;
    updatedAt: string;
    modules: TrainingModuleResponse[];
}

export interface TrainingPreferencesResponse {
    userId: string;
    goal?: string | null;
    targetRole?: string | null;
    seniority?: string | null;
    minutesPerDay?: number | null;
    updatedAt?: string | null;
}

export interface TrainingPreferencesRequest {
    goal?: string | null;
    targetRole?: string | null;
    seniority?: string | null;
    minutesPerDay?: number | null;
}

export interface BadgeResponse {
    id: number;
    name: string;
    description: string;
    icon: string;
    category:
        | "INTERVIEW"
        | "CONSISTENCY"
        | "PERFORMANCE"
        | "ENGAGEMENT"
        | "COMMUNITY"
        | "MILESTONE"
        | "OTHER"
        | string;
    xpReward: number;
    criteriaJson?: string | null;
    isActive?: boolean | null;
}

export interface UserBadgeResponse {
    id: number;
    userId: string;
    badgeId: number;
    badge?: BadgeResponse | null;
    earnedDate?: string | null;
    progress?: number | null;
    createdAt?: string | null;
}

export interface TrainingModuleResponse {
    id: number;
    pathId: number;
    category:
        | "COMMUNICATION"
        | "STRESS_MANAGEMENT"
        | "CONTENT_PREP"
        | "BODY_LANGUAGE"
        | "INDUSTRY_SPECIFIC";
    title: string;
    lessons: number;
    completedLessons: number;
    progress: number;
    xpReward: number;
    status: "LOCKED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
    unlockedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    moduleLessons?: TrainingModuleLessonResponse[];
}

export interface TrainingModuleLessonResponse {
    id: number;
    moduleId: number;
    lessonId?: number | null;
    title: string;
    format: "TEXT" | "VIDEO";
    contentMarkdown?: string | null;
    videoUrl?: string | null;
    estimatedMinutes: number;
    orderIndex: number;
    status: "PENDING" | "COMPLETED";
    completedAt?: string | null;
}

export interface TrainingLessonResponse {
    id: number;
    category:
        | "COMMUNICATION"
        | "STRESS_MANAGEMENT"
        | "CONTENT_PREP"
        | "BODY_LANGUAGE"
        | "INDUSTRY_SPECIFIC";
    title: string;
    format: "TEXT" | "VIDEO";
    summary?: string | null;
    contentMarkdown?: string | null;
    videoUrl?: string | null;
    estimatedMinutes: number;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    language: string;
    active: boolean;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTrainingPathRequest {
    userId: string;
    status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
    xpThreshold: number;
}

export interface UpdateModuleProgressRequest {
    completedLessons?: number;
    progress?: number;
}

export interface CreateDailyActivityRequest {
    userId: string;
    activityDate?: string;
    xpEarned?: number;
    sessionCompleted?: boolean;
    goalsCompleted?: number;
    behavioralCount?: number;
    libraryCount?: number;
    quizCount?: number;
}

export interface DailyActivityResponse {
    id?: number;
    userId: string;
    activityDate: string;
    xpEarned: number;
    sessionCompleted: boolean;
    goalsCompleted: number;
    behavioralCount: number;
    libraryCount: number;
    quizCount: number;
    createdAt?: string;
}

export interface UserXPTrackerResponse {
    id: number;
    userId: string;
    totalXp: number;
    currentLevel: number;
    xpToNextLevel: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate?: string;
}
