import { User, Mentor, Resource, Quiz, QuizQuestion, InterviewSession, Report, Badge, Post, TrainingModule, PricingPlan } from '../models/models';

// ── Mock User ──
export const MOCK_USER: User = {
  id: 'u001',
  name: 'Amara Osei',
  email: 'amara.osei@email.com',
  avatar: '',
  initials: 'AO',
  title: 'Computer Science Graduate',
  location: 'London, UK',
  bio: 'Recent CS graduate passionate about software engineering and product management. Actively preparing for roles at top tech companies.',
  targetRoles: ['Software Engineer', 'Product Manager', 'Full-Stack Developer'],
  skills: ['JavaScript', 'TypeScript', 'Angular', 'Python', 'SQL', 'System Design', 'Agile'],
  plan: 'premium',
  joinedDate: 'Sep 2024',
  profileCompletion: 82,
  readinessScore: 74,
  xp: 3840,
  level: 12,
  streak: 7
};

// ── Mock Dashboard ──
export const MOCK_DASHBOARD = {
  welcomeMessage: 'Welcome back, Amara! 👋',
  weeklyProgress: 68,
  sessionsThisWeek: 4,
  nextSession: {
    title: 'Google SWE Mock Interview',
    date: 'Tomorrow, 14:00',
    type: 'Technical',
    duration: '45 min'
  },
  recentScore: 78,
  totalSessions: 23,
  totalQuizzes: 14,
  hoursStudied: 36,
  recentActivity: [
    { icon: '<i class="bi bi-bullseye"></i>', text: 'Completed Behavioral Interview Practice', time: '2h ago', type: 'interview' },
    { icon: '<i class="bi bi-pencil-square"></i>', text: 'Scored 85% on Data Structures Quiz', time: '5h ago', type: 'quiz' },
    { icon: '<i class="bi bi-award-fill"></i>', text: 'Earned "Consistent Learner" badge', time: '1d ago', type: 'badge' },
    { icon: '<i class="bi bi-book-fill"></i>', text: 'Saved "STAR Method Guide" to library', time: '1d ago', type: 'resource' },
    { icon: '<i class="bi bi-people-fill"></i>', text: 'Booked session with Dr. Priya Kapoor', time: '2d ago', type: 'mentor' },
  ]
};

// ── Mock Interviews ──
export const MOCK_INTERVIEWS: InterviewSession[] = [
  {
    id: 'int001',
    title: 'Google SWE Behavioral Mock',
    type: 'behavioral',
    date: 'Tomorrow, 14:00',
    duration: '45 min',
    status: 'upcoming',
    score: null,
    questions: 8,
    role: 'Software Engineer',
    company: 'Google',
    notes: 'Focus on leadership and teamwork examples.'
  },
  {
    id: 'int002',
    title: 'Amazon Leadership Principles',
    type: 'behavioral',
    date: 'Jan 18, 2025',
    duration: '60 min',
    status: 'completed',
    score: 82,
    questions: 10,
    role: 'Software Development Engineer',
    company: 'Amazon',
    notes: 'Great performance on customer obsession examples.'
  },
  {
    id: 'int003',
    title: 'Meta Frontend Technical Round',
    type: 'technical',
    date: 'Jan 15, 2025',
    duration: '55 min',
    status: 'completed',
    score: 71,
    questions: 6,
    role: 'Frontend Engineer',
    company: 'Meta',
    notes: 'Need to improve system design explanations.'
  },
  {
    id: 'int004',
    title: 'Microsoft PM Case Study',
    type: 'case',
    date: 'Feb 3, 2025',
    duration: '60 min',
    status: 'upcoming',
    score: null,
    questions: 5,
    role: 'Product Manager',
    company: 'Microsoft',
    notes: 'Prepare product metrics and estimation frameworks.'
  },
  {
    id: 'int005',
    title: 'Stripe System Design',
    type: 'technical',
    date: 'Jan 10, 2025',
    duration: '50 min',
    status: 'completed',
    score: 76,
    questions: 4,
    role: 'Backend Engineer',
    company: 'Stripe',
    notes: 'Work on distributed systems concepts.'
  }
];

// ── Mock Reports ──
export const MOCK_REPORTS: Report[] = [
  {
    id: 'rep001',
    sessionId: 'int002',
    sessionTitle: 'Amazon Leadership Principles',
    date: 'Jan 18, 2025',
    overallScore: 82,
    categories: {
      communication: 88,
      confidence: 80,
      clarity: 85,
      structure: 82,
      stressHandling: 75,
      readiness: 83
    },
    strengths: [
      'Excellent use of STAR method throughout',
      'Strong concrete examples with measurable outcomes',
      'Clear and confident communication style',
      'Well-structured responses under 3 minutes each'
    ],
    weaknesses: [
      'Occasional filler words ("um", "like")',
      'Could quantify impact more often',
      'Some answers lacked concise conclusion'
    ],
    suggestions: [
      'Practice "ownership" principle with more specific examples',
      'Prepare 2-3 failure stories showing growth mindset',
      'Work on eliminating filler words through recording practice'
    ]
  },
  {
    id: 'rep002',
    sessionId: 'int003',
    sessionTitle: 'Meta Frontend Technical Round',
    date: 'Jan 15, 2025',
    overallScore: 71,
    categories: {
      communication: 76,
      confidence: 68,
      clarity: 72,
      structure: 70,
      stressHandling: 65,
      readiness: 74
    },
    strengths: [
      'Good foundational React knowledge',
      'Solid understanding of CSS and performance',
      'Collaborative thinking and asking clarifying questions'
    ],
    weaknesses: [
      'System design explanations need more depth',
      'Confidence dips on ambiguous questions',
      'Need stronger examples of scale consideration'
    ],
    suggestions: [
      'Study frontend system design: CDNs, caching, bundling',
      'Practice live coding with time constraints daily',
      'Build confidence by reviewing past successful answers'
    ]
  }
];

// ── Mock Quizzes ──
export const MOCK_QUIZZES: Quiz[] = [
  {
    id: 'q001',
    title: 'STAR Method Mastery',
    category: 'Behavioral',
    difficulty: 'easy',
    questions: 10,
    duration: '15 min',
    tags: ['behavioral', 'storytelling', 'communication'],
    description: 'Master the Situation-Task-Action-Result framework for answering behavioral questions effectively.',
    completedByPercent: 84
  },
  {
    id: 'q002',
    title: 'Data Structures Fundamentals',
    category: 'Technical',
    difficulty: 'medium',
    questions: 15,
    duration: '25 min',
    tags: ['arrays', 'trees', 'graphs', 'algorithms'],
    description: 'Test your knowledge of essential data structures and their time/space complexities.',
    completedByPercent: 62
  },
  {
    id: 'q003',
    title: 'Product Sense & Strategy',
    category: 'Product',
    difficulty: 'medium',
    questions: 12,
    duration: '20 min',
    tags: ['PM', 'product thinking', 'metrics', 'prioritization'],
    description: 'Evaluate your product thinking skills across metrics, roadmapping, and user empathy.',
    completedByPercent: 71
  },
  {
    id: 'q004',
    title: 'System Design Principles',
    category: 'Technical',
    difficulty: 'hard',
    questions: 8,
    duration: '30 min',
    tags: ['architecture', 'scalability', 'databases', 'APIs'],
    description: 'Challenge yourself with distributed systems, load balancing, and high availability concepts.',
    completedByPercent: 38
  },
  {
    id: 'q005',
    title: 'Communication & Soft Skills',
    category: 'Behavioral',
    difficulty: 'easy',
    questions: 10,
    duration: '12 min',
    tags: ['communication', 'teamwork', 'conflict resolution'],
    description: 'Assess your interpersonal and professional communication skills for interviews.',
    completedByPercent: 90
  },
  {
    id: 'q006',
    title: 'SQL & Database Queries',
    category: 'Technical',
    difficulty: 'medium',
    questions: 12,
    duration: '20 min',
    tags: ['SQL', 'databases', 'queries', 'joins'],
    description: 'Practice SQL queries, joins, aggregations, and optimization techniques.',
    completedByPercent: 55
  }
];

export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'qq001',
    text: 'When answering a behavioral question, the STAR method stands for:',
    options: [
      'Situation, Task, Action, Result',
      'Strategy, Target, Assessment, Review',
      'Strength, Task, Achievement, Reflection',
      'Story, Theme, Action, Resolution'
    ],
    correct: 0,
    explanation: 'STAR stands for Situation (context), Task (your responsibility), Action (steps you took), Result (outcome/impact).'
  },
  {
    id: 'qq002',
    text: 'Which data structure provides O(1) average-case lookup time?',
    options: ['Binary Search Tree', 'Hash Map', 'Linked List', 'Queue'],
    correct: 1,
    explanation: 'Hash Maps provide O(1) average-case lookup through direct key hashing, though worst case is O(n) with many collisions.'
  },
  {
    id: 'qq003',
    text: 'What is the most important first step in a product design question?',
    options: [
      'Jump directly to solutions',
      'Clarify the goal and constraints',
      'List all features you can think of',
      'Design the technical architecture'
    ],
    correct: 1,
    explanation: 'Clarifying the goal, target user, and constraints ensures you solve the right problem. Great PMs always start by aligning on objectives.'
  }
];

// ── Mock Mentors ──
// IMPORTANT: IDs must be valid UUIDs matching Keycloak user IDs
// First mentor maps to real user haji@gmail.com in the system
export const MOCK_MENTORS: Mentor[] = [
  {
    id: 'af8e42ab-bd6f-4ff8-8b53-a3bb33bb49d4', // haji@gmail.com — real mentor
    name: 'Dr. Priya Kapoor',
    initials: 'PK',
    avatar: '',
    title: 'Senior Engineering Manager',
    company: 'Google',
    expertise: ['System Design', 'Leadership', 'Career Growth'],
    rating: 4.9,
    reviews: 148,
    sessions: 312,
    available: true,
    price: 80,
    bio: 'Former SWE turned EM at Google with 12 years of experience. I help candidates crack FAANG interviews and transition into leadership.',
    nextAvailable: 'Tomorrow, 10:00 AM'
  },
  {
    id: '11111111-1111-1111-1111-111111111111', // placeholder
    name: 'James Okafor',
    initials: 'JO',
    avatar: '',
    title: 'Product Lead',
    company: 'Stripe',
    expertise: ['Product Management', 'Product Strategy', 'Behavioral Interviews'],
    rating: 4.8,
    reviews: 94,
    sessions: 187,
    available: true,
    price: 65,
    bio: 'Product Lead at Stripe building payments infrastructure. Expert in product sense interviews and PM career transitions.',
    nextAvailable: 'Thu, Jan 23'
  },
  {
    id: '22222222-2222-2222-2222-222222222222', // placeholder
    name: 'Sofia Reyes',
    initials: 'SR',
    avatar: '',
    title: 'Staff Frontend Engineer',
    company: 'Spotify',
    expertise: ['Frontend Engineering', 'React', 'Angular', 'Career Coaching'],
    rating: 4.9,
    reviews: 76,
    sessions: 143,
    available: false,
    price: 70,
    bio: 'Staff Engineer at Spotify specializing in web performance and component architecture. I help frontend candidates land their dream roles.',
    nextAvailable: 'Next Monday'
  },
  {
    id: '33333333-3333-3333-3333-333333333333', // placeholder
    name: 'Raj Malhotra',
    initials: 'RM',
    avatar: '',
    title: 'Data Science Lead',
    company: 'McKinsey',
    expertise: ['Data Science', 'Analytics', 'Case Interviews', 'Consulting'],
    rating: 4.7,
    reviews: 112,
    sessions: 224,
    available: true,
    price: 90,
    bio: 'Leading data science teams at McKinsey. Specialist in case interview preparation and analytical problem solving.',
    nextAvailable: 'Today, 4:00 PM'
  },
  {
    id: '44444444-4444-4444-4444-444444444444', // placeholder
    name: 'Léa Martin',
    initials: 'LM',
    avatar: '',
    title: 'Talent Partner',
    company: 'Airbnb',
    expertise: ['Interview Coaching', 'Resume Review', 'Negotiation', 'Recruiting'],
    rating: 4.8,
    reviews: 203,
    sessions: 456,
    available: true,
    price: 55,
    bio: 'Talent Partner at Airbnb with 9 years in recruiting. I help candidates understand what hiring managers actually look for.',
    nextAvailable: 'Tomorrow, 2:00 PM'
  },
  {
    id: '55555555-5555-5555-5555-555555555555', // placeholder
    name: 'Tariq Ibrahim',
    initials: 'TI',
    avatar: '',
    title: 'Backend Architect',
    company: 'Shopify',
    expertise: ['Backend Engineering', 'System Design', 'Distributed Systems', 'Golang'],
    rating: 4.6,
    reviews: 58,
    sessions: 98,
    available: true,
    price: 75,
    bio: 'Building Shopify\'s core infrastructure. Passionate about mentoring junior engineers on technical interview strategies.',
    nextAvailable: 'Fri, Jan 24'
  }
];

// ── Mock Community Posts ──
export const MOCK_POSTS: Post[] = [
  {
    id: 'p001',
    author: 'Kenji Nakamura',
    authorInitials: 'KN',
    authorTitle: 'CS Graduate → Google SWE',
    content: 'Just got my Google offer! 🎉 After 3 months on InterviewPrepTN — 42 mock sessions, 200+ questions — I finally cracked it. The AI feedback on filler words alone changed my game. To anyone doubting: keep going. It\'s genuinely worth it.',
    likes: 284,
    comments: 47,
    timeAgo: '2h ago',
    tags: ['success', 'Google', 'SWE'],
    type: 'success'
  },
  {
    id: 'p002',
    author: 'Maya Chen',
    authorInitials: 'MC',
    authorTitle: 'Final Year Student, Imperial College',
    content: 'Hot take: the STAR method is overrated if you don\'t practice the *delivery*. Spent weeks perfecting content but bombed interviews because of nervous speed-talking. Now tracking my talking pace and it\'s genuinely changing things. Anyone else had this?',
    likes: 156,
    comments: 34,
    timeAgo: '4h ago',
    tags: ['behavioral', 'delivery', 'tips'],
    type: 'discussion'
  },
  {
    id: 'p003',
    author: 'Aisha Diallo',
    authorInitials: 'AD',
    authorTitle: 'Data Analyst @ Deloitte',
    content: 'PSA: If you\'re prepping for analytics roles, practice SQL under time pressure. I bombed two rounds at companies I loved because my SQL is great but SLOW. Timer practice changed everything. Share your study routines below 👇',
    likes: 98,
    comments: 29,
    timeAgo: '6h ago',
    tags: ['SQL', 'analytics', 'study tips'],
    type: 'tip'
  },
  {
    id: 'p004',
    author: 'Luca Ferrari',
    authorInitials: 'LF',
    authorTitle: 'Computer Engineering, UCL',
    content: 'Has anyone cracked how to answer "What\'s your biggest weakness?" without it sounding fake? Every answer I give feels rehearsed. Looking for genuinely honest approaches that still land well.',
    likes: 67,
    comments: 52,
    timeAgo: '8h ago',
    tags: ['behavioral', 'weakness question', 'advice'],
    type: 'question'
  },
  {
    id: 'p005',
    author: 'Zara Williams',
    authorInitials: 'ZW',
    authorTitle: 'Junior PM @ Revolut',
    content: 'Just finished my mentorship session with James Okafor (Stripe) — absolute gold. The way he reframes "tell me about yourself" as your personal product pitch completely changed my approach. Highly recommend booking with him!',
    likes: 145,
    comments: 18,
    timeAgo: '12h ago',
    tags: ['mentorship', 'PM', 'advice'],
    type: 'tip'
  }
];

// ── Mock Library Resources ──
export const MOCK_RESOURCES: Resource[] = [
  {
    id: 'r001',
    title: 'The Ultimate STAR Method Guide',
    type: 'article',
    category: 'Behavioral',
    duration: '8 min read',
    level: 'beginner',
    tags: ['STAR', 'behavioral', 'storytelling'],
    saved: true,
    views: 12400,
    rating: 4.8,
    description: 'A comprehensive breakdown of how to craft compelling behavioral answers using the STAR framework with 20+ example stories.'
  },
  {
    id: 'r002',
    title: 'System Design Interview Masterclass',
    type: 'video',
    category: 'Technical',
    duration: '52 min',
    level: 'advanced',
    tags: ['system design', 'architecture', 'scalability'],
    saved: false,
    views: 8900,
    rating: 4.9,
    description: 'End-to-end walkthrough of designing scalable systems. Covers URL shorteners, ride-sharing apps, and social networks.'
  },
  {
    id: 'r003',
    title: 'Career Switch Stories: Into Tech',
    type: 'podcast',
    category: 'Career',
    duration: '38 min',
    level: 'beginner',
    tags: ['career change', 'motivation', 'stories'],
    saved: true,
    views: 5600,
    rating: 4.6,
    description: 'Real stories from professionals who switched into tech roles. Honest conversations about the interview grind.'
  },
  {
    id: 'r004',
    title: '50 Behavioral Questions to Master',
    type: 'exercise',
    category: 'Behavioral',
    duration: 'Interactive',
    level: 'intermediate',
    tags: ['questions', 'practice', 'behavioral'],
    saved: false,
    views: 18200,
    rating: 4.7,
    description: 'Practice the 50 most common behavioral interview questions with AI-powered feedback on your recorded responses.'
  },
  {
    id: 'r005',
    title: 'CV Template — Tech Roles 2025',
    type: 'template',
    category: 'Job Search',
    duration: 'Download',
    level: 'beginner',
    tags: ['CV', 'resume', 'template', 'ATS'],
    saved: true,
    views: 24100,
    rating: 4.5,
    description: 'ATS-optimized CV template designed for software engineering and tech roles. Includes examples and guidelines.'
  },
  {
    id: 'r006',
    title: 'Mastering Product Sense Questions',
    type: 'article',
    category: 'Product',
    duration: '12 min read',
    level: 'intermediate',
    tags: ['PM', 'product sense', 'framework'],
    saved: false,
    views: 7300,
    rating: 4.8,
    description: 'A structured framework for answering product design questions. Covers user empathy, metrics, and prioritization.'
  },
  {
    id: 'r007',
    title: 'Negotiation & Offer Letters',
    type: 'video',
    category: 'Career',
    duration: '28 min',
    level: 'intermediate',
    tags: ['salary', 'negotiation', 'offers'],
    saved: true,
    views: 9800,
    rating: 4.9,
    description: 'How to evaluate and negotiate job offers confidently. Real examples, scripts, and psychological tactics.'
  },
  {
    id: 'r008',
    title: 'LeetCode Patterns Cheatsheet',
    type: 'template',
    category: 'Technical',
    duration: 'Reference',
    level: 'intermediate',
    tags: ['leetcode', 'algorithms', 'patterns', 'coding'],
    saved: false,
    views: 31500,
    rating: 4.7,
    description: 'Visual cheatsheet of the 15 most common algorithm patterns. Includes time complexity and example problems.'
  }
];

// ── Mock Badges ──
export const MOCK_BADGES: Badge[] = [
  { id: 'b001', name: 'First Interview', description: 'Completed your first mock session', icon: '<i class="bi bi-bullseye"></i>', color: 'teal', earned: true, earnedDate: 'Oct 2024', xpReward: 100 },
  { id: 'b002', name: 'Consistent Learner', description: '7-day study streak', icon: '<i class="bi bi-fire"></i>', color: 'peach', earned: true, earnedDate: 'Jan 2025', xpReward: 200 },
  { id: 'b003', name: 'Quiz Champion', description: 'Scored 90%+ on 3 quizzes', icon: '<i class="bi bi-trophy-fill"></i>', color: 'sand', earned: true, earnedDate: 'Dec 2024', xpReward: 300 },
  { id: 'b004', name: 'Community Voice', description: 'First 10 community likes', icon: '<i class="bi bi-chat-fill"></i>', color: 'cyan', earned: true, earnedDate: 'Nov 2024', xpReward: 150 },
  { id: 'b005', name: 'Speed Reader', description: 'Completed 5 library resources', icon: '<i class="bi bi-book-fill"></i>', color: 'mint', earned: true, earnedDate: 'Dec 2024', xpReward: 200 },
  { id: 'b006', name: 'Perfect Score', description: 'Score 100% on any quiz', icon: '<i class="bi bi-star-fill"></i>', color: 'purple', earned: false, xpReward: 500 },
  { id: 'b007', name: 'Mentor Graduate', description: 'Complete 3 mentoring sessions', icon: '<i class="bi bi-people-fill"></i>', color: 'sky', earned: false, xpReward: 400 },
  { id: 'b008', name: 'Interview Master', description: 'Complete 25 mock interviews', icon: '<i class="bi bi-mortarboard-fill"></i>', color: 'teal', earned: false, xpReward: 1000 }
];

// ── Mock Training Modules ──
export const MOCK_TRAINING: TrainingModule[] = [
  { id: 't001', title: 'Behavioral Interview Foundations', category: 'Behavioral', progress: 100, xp: 300, lessons: 8, completedLessons: 8, status: 'completed', icon: 'bi-chat-fill' },
  { id: 't002', title: 'STAR Method Advanced Practice', category: 'Behavioral', progress: 75, xp: 250, lessons: 6, completedLessons: 4, status: 'in-progress', icon: 'bi-star-fill' },
  { id: 't003', title: 'Technical Communication Skills', category: 'Technical', progress: 40, xp: 200, lessons: 10, completedLessons: 4, status: 'in-progress', icon: 'bi-laptop' },
  { id: 't004', title: 'System Design Fundamentals', category: 'Technical', progress: 0, xp: 400, lessons: 12, completedLessons: 0, status: 'locked', icon: 'bi-diagram-3-fill' },
  { id: 't005', title: 'Product Thinking & Strategy', category: 'Product', progress: 20, xp: 300, lessons: 8, completedLessons: 2, status: 'in-progress', icon: 'bi-bar-chart-fill' },
  { id: 't006', title: 'Confidence & Delivery Mastery', category: 'Soft Skills', progress: 60, xp: 150, lessons: 5, completedLessons: 3, status: 'in-progress', icon: 'bi-mic-fill' },
  { id: 't007', title: 'Salary Negotiation Playbook', category: 'Career', progress: 0, xp: 200, lessons: 4, completedLessons: 0, status: 'locked', icon: 'bi-cash-coin' }
];

// ── Mock Pricing ──
export const MOCK_PRICING: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Start your preparation journey with essential tools.',
    recommended: false,
    ctaLabel: 'Get Started Free',
    color: 'neutral',
    features: [
      { text: '5 mock interview sessions/month', included: true },
      { text: '3 quiz assessments/month', included: true },
      { text: 'Basic performance reports', included: true },
      { text: 'Community access', included: true },
      { text: '10 library resources', included: true },
      { text: 'AI feedback & scoring', included: false },
      { text: 'Unlimited mock sessions', included: false },
      { text: 'Mentor sessions', included: false },
      { text: 'Video analysis', included: false },
      { text: 'Priority support', included: false },
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19,
    period: 'per month',
    description: 'Everything you need to land your dream role.',
    recommended: true,
    ctaLabel: 'Start Premium',
    color: 'teal',
    features: [
      { text: 'Unlimited mock interview sessions', included: true },
      { text: 'Unlimited quiz assessments', included: true },
      { text: 'Advanced AI feedback & scoring', included: true },
      { text: 'Full library access (500+ resources)', included: true },
      { text: 'Detailed analytics & reports', included: true },
      { text: '2 mentor sessions/month', included: true },
      { text: 'Video playback & analysis', included: true },
      { text: 'Personalized learning paths', included: true },
      { text: 'Community premium access', included: true },
      { text: 'Priority support', included: true },
    ]
  },
  {
    id: 'university',
    name: 'University',
    price: 199,
    period: 'per year',
    description: 'Campus-wide access for cohorts and career centers.',
    recommended: false,
    ctaLabel: 'Contact Sales',
    color: 'cyan',
    features: [
      { text: 'Everything in Premium', included: true },
      { text: 'Bulk seat licensing', included: true },
      { text: 'Cohort management dashboard', included: true },
      { text: 'Career center integrations', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Dedicated mentor pool', included: true },
      { text: 'Analytics for institutions', included: true },
      { text: 'API access', included: true },
      { text: 'SSO / LMS integration', included: true },
      { text: 'Dedicated success manager', included: true },
    ]
  }
];

// ── Mock Testimonials ──
export const MOCK_TESTIMONIALS = [
  {
    name: 'Kenji Nakamura',
    initials: 'KN',
    role: 'Software Engineer @ Google',
    text: 'InterviewPrepTN completely transformed how I prepare for interviews. The AI feedback caught habits I never knew I had — like rushing through answers when nervous. Landed Google after 3 months.',
    rating: 5
  },
  {
    name: 'Priya Menon',
    initials: 'PM',
    role: 'Product Manager @ Meta',
    text: 'The mentor sessions were a game-changer. Getting real-time feedback from an actual PM at a top company gave me the confidence I was missing. Worth every penny.',
    rating: 5
  },
  {
    name: 'Carlos Silva',
    initials: 'CS',
    role: 'Data Analyst @ Revolut',
    text: 'I was applying for jobs for 8 months with no offers. Two months on InterviewPrepTN later, I had three offers to choose from. The quiz assessments helped me identify my weak spots.',
    rating: 5
  }
];

export const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Kenji N.', initials: 'KN', xp: 8420, streak: 28 },
  { rank: 2, name: 'Aisha D.', initials: 'AD', xp: 7890, streak: 21 },
  { rank: 3, name: 'Sofia R.', initials: 'SR', xp: 6540, streak: 15 },
  { rank: 4, name: 'You (Amara)', initials: 'AO', xp: 3840, streak: 7 },
  { rank: 5, name: 'Maya C.', initials: 'MC', xp: 3200, streak: 5 },
];

export const TRENDING_TOPICS = [
  { tag: 'System Design', posts: 234 },
  { tag: 'FAANG Prep', posts: 189 },
  { tag: 'Behavioral Interviews', posts: 156 },
  { tag: 'Salary Negotiation', posts: 98 },
  { tag: 'PM Interviews', posts: 87 },
];

export const WHO_TO_FOLLOW = [
  { name: 'Tariq Ibrahim', initials: 'TI', title: 'Backend Architect @ Shopify' },
  { name: 'Zara Williams', initials: 'ZW', title: 'Junior PM @ Revolut' },
  { name: 'Marcus Lee', initials: 'ML', title: 'ML Engineer @ DeepMind' },
];