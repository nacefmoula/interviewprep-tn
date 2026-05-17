// User model
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  initials: string;
  title: string;
  location: string;
  bio: string;
  targetRoles: string[];
  skills: string[];
  plan: 'free' | 'premium' | 'university';
  joinedDate: string;
  profileCompletion: number;
  readinessScore: number;
  xp: number;
  level: number;
  streak: number;
}

// Mentor model
// export interface Mentor {
//   id: string;
//   name: string;
//   initials: string;
//   avatar: string;
//   title: string;
//   company: string;
//   expertise: string[];
//   rating: number;
//   reviews: number;
//   sessions: number;
//   available: boolean;
//   price: number;
//   bio: string;
//   nextAvailable: string;
// }
export interface Mentor {
  id: string;
  name: string;
  initials: string;
  avatar: string;
  title: string;
  company: string;
  expertise: string[];
  rating: number;
  reviews: number;
  sessions: number;
  available: boolean;
  price: number;
  bio: string;
  nextAvailable: string;
  // NEW — real data from backend
  completedSessions?: number;
  averageRating?: number;
  totalRatings?: number;
  canRate?: boolean; // legacy flag; UI now allows rating even without sessions

  // Current user's rating for this mentor (optional)
  myRatingStars?: number | null;
  myRatingComment?: string | null;
}

export interface MentorScoreDTO {
  mentorId: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  preferredIndustry: string;
  skills: string[];
  score: number;
  aiExplanation: string;
  status: string;
}

// Resource model
export interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'podcast' | 'exercise' | 'template' | string;
  category: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced' | string;
  tags: string[];
  saved: boolean;
  views: number;
  rating: number;
  description: string;
  url?: string;
  thumbnailUrl?: string;
  industry?: string;
  categoryId?: string;
}

// Quiz model
export interface Quiz {
  id: string;
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: number;
  duration: string;
  tags: string[];
  description: string;
  completedByPercent: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

// Interview Session model
export interface InterviewSession {
  id: string;
  title: string;
  type: 'behavioral' | 'technical' | 'situational' | 'case';
  date: string;
  duration: string;
  status: 'upcoming' | 'completed' | 'in-progress';
  score: number | null;
  questions: number;
  role: string;
  company: string;
  notes: string;
}

// Report model
export interface Report {
  id: string;
  sessionId: string;
  sessionTitle: string;
  date: string;
  overallScore: number;
  categories: {
    communication: number;
    confidence: number;
    clarity: number;
    structure: number;
    stressHandling: number;
    readiness: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

// Badge model
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedDate?: string;
  xpReward: number;
}

// Post model
export interface Post {
  id: string;
  author: string;
  authorInitials: string;
  authorTitle: string;
  content: string;
  likes: number;
  comments: number;
  timeAgo: string;
  tags: string[];
  type: 'discussion' | 'success' | 'question' | 'tip';
}

// Training module model
export interface TrainingModuleLesson {
  id: string;
  title: string;
  status: 'PENDING' | 'COMPLETED';
  orderIndex: number;
  format?: 'TEXT' | 'VIDEO' | string;
  contentMarkdown?: string | null;
  videoUrl?: string | null;
  estimatedMinutes?: number;
}

export interface TrainingModule {
  id: string;
  title: string;
  category: string;
  progress: number;
  xp: number;
  lessons: number;
  completedLessons: number;
  status: 'locked' | 'in-progress' | 'completed';
  icon: string;
  moduleLessons?: TrainingModuleLesson[];
}

// Pricing plan
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: { text: string; included: boolean }[];
  recommended: boolean;
  ctaLabel: string;
  color: string;
}

// ── Mentorship service DTOs ──────────────────────────────────────────────────

export interface MentorRequest {
  id: string;
  mentorId: string;
  menteeId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface MentorSession {
  id: string;
  requestId: string;
  scheduledAt: string;
  meetingLink: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface CreateMentorRequestDTO {
  mentorId: string;
}

export interface CreateMentorSessionDTO {
  requestId: string;
  scheduledAt: string;
  meetingLink: string;
}
