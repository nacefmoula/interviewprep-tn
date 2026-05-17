// quiz.model.ts
export interface Quiz {
  id?: string; // UUID
  title: string;
  description: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit?: number;
  maxAttempts?: number;
  passingScore: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  questions: Question[];
  createdAt?: Date;
}

export interface Question {
  id?: string;
  content: string;
  type: 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'TRUE_FALSE';
  points: number;
  explanation?: string;
  hint?: string;
  answers: Answer[];
}

export interface Answer {
  id?: string;
  content: string;
  isCorrect: boolean;
  answerExplanation?: string;
}