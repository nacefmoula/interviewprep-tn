// Enums matching backend exactly
export type InterviewLanguage = "EN" | "FR" | "AR_TN";
export type InterviewType =
    | "BEHAVIORAL"
    | "TECHNICAL"
    | "CASE_STUDY"
    | "PANEL"
    | "PITCH";
export type SessionStatus =
    | "IN_PROGRESS"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED";
export type IndustryType =
    | "IT_TECH"
    | "FINANCE"
    | "HEALTH"
    | "ENGINEERING"
    | "CONSULTING"
    | "SALES_MARKETING";
export type CareerLevel = "JUNIOR" | "MID" | "SENIOR";
export type PreparationLevel =
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "EXPERT";
export type QuestionType = "BEHAVIORAL" | "TECHNICAL" | "CASE_STUDY";

// Backend response shapes
export interface InterviewSessionResponse {
    id: number;
    userId: string;
    type: InterviewType;
    industry: IndustryType;
    targetLevel: CareerLevel;
    status: SessionStatus;
    durationMinutes: number;
    difficultyLevel: number;
    isRecorded: boolean;
    consentGiven: boolean;
    recordingUrl: string | null;
    startedAt: string;
    endedAt: string | null;
    createdAt: string;
    remainingTimeMinutes: number;
    language: InterviewLanguage;
}

export interface CreateSessionRequest {
    type: InterviewType;
    industry: IndustryType;
    targetLevel: CareerLevel;
    language?: InterviewLanguage;
    durationMinutes: number;
    difficultyLevel: number;
    isRecorded: boolean;
    consentGiven: boolean;
}

export interface Question {
    id: number;
    text: string;
    type: QuestionType;
    industry: IndustryType;
    difficulty: CareerLevel;
    expectedMethod: string;
    avgAnswerTimeSeconds: number;
    isActive: boolean;
}

export interface SubmitResponseRequest {
    questionId: number;
    transcription: string;
    durationSeconds: number;
    wordCount: number;
}

export interface SubmitResponseResult {
    responseId: number;
    sessionId: number;
    questionId: number;
    overallScore: number;
    nextQuestion: Question | null;
}

export interface PerformanceReport {
    id: number;
    globalScore: number;
    communicationScore: number;
    contentQualityScore: number;
    stressManagementScore: number;
    confidenceScore: number;
    preparationLevel: PreparationLevel;
    topStrengths: string;
    areasForImprovement: string;
    actionableRecommendations: string;
    estimatedSessionsToNextLevel: number;
    generatedAt: string;
        hesitationScore?: number;
    stressProxyScore?: number;
    behavioralSummary?: string;
    communicationSummary?: string;
    stressProxySummary?: string;
}
export interface ProgressTracker {
    userId: string;
    totalSessionsCompleted: number;
    averageScore: number;
    bestScore: number;
    currentLevel: PreparationLevel;
    lastSessionAt: string;
}
