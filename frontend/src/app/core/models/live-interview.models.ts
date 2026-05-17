// live-interview.models.ts
// Mirrors the backend DTOs exactly — keep in sync with LiveStartResponse,
// LiveActionResponse, CommitTurnRequest and their nested records.

export type LiveSessionStatus = "ACTIVE" | "FINISHED" | "CANCELLED";

export type LiveInterviewPhase =
  | "PRE_INTERVIEW"
  | "INTRO"
  | "SELF_INTRO_CAPTURE"
  | "ASKING"
  | "WAITING_ANSWER"
  | "LISTENING"
  | "ENCOURAGING"
  | "EVALUATING"
  | "FINISHED";

export type LiveAgentMode =
  | "INTRO"
  | "SELF_INTRO"
  | "QUESTION"
  | "ENCOURAGE"
  | "PROBE"
  | "FEEDBACK"
  | "END";

export interface LiveTimelinePoint {
  t:          number;
  stress:     number | null;
  confidence: number | null;
  hesitation: number | null;
  volume:     number | null;
  speaking:   boolean | null;
}

// ── /start response ──────────────────────────────────────────────────────────
export interface LiveStartResponse {
  sessionId:      number;
  answeredCount:  number;
  maxQuestions:   number;
  currentQuestion: any | null;
  liveStatus:     LiveSessionStatus;
  phase:          LiveInterviewPhase;
  agentMode:      LiveAgentMode;
  agentGreeting:  string | null;
  agentMessage:   string | null;
  useNeuralTts:   boolean;
}

// ── /commit-turn response ────────────────────────────────────────────────────
export interface LiveActionResponse {
  sessionFinished:         boolean;
  transcript:              string | null;
  overallScore:            number | null;
  communicationScore:      number | null;
  hesitationScore:         number | null;
  stressProxyScore:        number | null;
  confidenceProxyScore:    number | null;
  feedback:                string | null;
  nextQuestion:            any | null;
  reportId:                number | null;
  phase:                   LiveInterviewPhase;
  agentMode:               LiveAgentMode;
  agentMessage:            string | null;
  encouragement:           string | null;
  shouldSpeakAgentMessage: boolean;
  stressTimeline:          LiveTimelinePoint[] | null;
}

// ── /commit-turn request ─────────────────────────────────────────────────────
export interface CommitTurnPayload {
  questionId:       number | null;
  pcm16Base64:      string;
  durationSeconds:  number;
  audioMetrics:     AudioMetrics | null;
  faceMetrics:      FaceMetrics | null;
  turnMode:         LiveAgentMode | null;
  stressTimeline?:  LiveTimelinePoint[] | null;
  partialTranscript?: string | null;
}

export interface AudioMetrics {
  averageVolume: number | null;
  maxVolume:     number | null;
  silenceRatio:  number | null;
}

export interface FaceMetrics {
  blinkRate:          number | null;
  gazeStabilityScore: number | null;
  headMotionScore:    number | null;
  browTensionScore:   number | null;
  mouthTensionScore:  number | null;
}

// Alias used by FaceMetricsService
export type FaceMetricsPayload = FaceMetrics;

// Used by LiveInterviewApiService
export interface CommitTurnRequest {
  questionId:         number | null;
  pcm16Base64:        string;
  durationSeconds:    number;
  audioMetrics:       AudioMetrics | null;
  faceMetrics:        FaceMetrics | null;
  turnMode:           LiveAgentMode | null;
  stressTimeline?:    LiveTimelinePoint[] | null;
  partialTranscript?: string | null;
}

// Response shape for ending a live interview session
export interface EndLiveInterviewResponse {
  sessionId:  number;
  reportId:   number | null;
  message:    string | null;
}