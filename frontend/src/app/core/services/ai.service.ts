import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ── DTOs (Interfaces de données) ──────────────────────────────────────────────

export interface GenerateQuizRequest {
  moduleId: number | string;
  moduleTitle: string;
  moduleCategory: string;
  moduleContent: string;
  questionCount: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  language: 'fr' | 'en' | 'ar';
}

export interface QuizResponse {
  id?: string;
  moduleId: number;
  title: string;
  description: string;
  questions: QuestionResponse[];
}

export interface QuestionResponse {
  id?: string;
  content: string;
  type: string;
  points: number;
  answers: AnswerResponse[];
}

export interface AnswerResponse {
  id?: string;
  content: string;
  isCorrect: boolean;
}

export interface ModuleSummaryResponse {
  moduleId: number;
  moduleTitle: string;
  summary: string;
  keyPoints: string[];
  estimatedReadMinutes: number;
}

export interface VideoScriptResponse {
  moduleId: number;
  moduleTitle: string;
  script: string;
  estimatedDurationSeconds: number;
  scenes: VideoScene[];
}

export interface VideoScene {
  sceneNumber: number;
  title: string;
  narration: string;
  visualSuggestion: string;
  keyWord: string;
  durationSeconds: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);

  private quizBase   = `${environment.quizApiUrl}/api/quizzes/ai`;
  private reportBase = `${environment.quizApiUrl}/api/report`;

  /**
   * 1. GÉNÉRER QUIZ (Port 8082 -> Gemini)
   * Envoie le moduleId pour assurer le filtrage en base de données.
   */
  generateQuiz(req: GenerateQuizRequest): Observable<QuizResponse> {
    const body = {
      ...req,
      moduleId: req.moduleId // Assure la correspondance avec le Long moduleId du Java
    };

    return this.http.post<QuizResponse>(`${this.quizBase}/generate`, body)
      .pipe(catchError(this.handleError));
  }

  /**
   * 2. RÉSUMÉ MODULE (Port 8085 -> Groq)
   */
  summarizeModule(moduleId: number | string, language = 'fr', moduleTitle?: string, moduleCategory?: string): Observable<ModuleSummaryResponse> {
    return this.http.post<ModuleSummaryResponse>(
      `${this.quizBase}/modules/${moduleId}/summary?language=${language}`,
      { moduleTitle: moduleTitle ?? '', moduleCategory: moduleCategory ?? '' }
    ).pipe(catchError(this.handleError));
  }

  /**
   * 3. SCRIPT VIDÉO (Port 8085 -> Groq)
   */
  generateVideoScript(moduleId: number | string, language = 'fr', moduleTitle?: string, moduleCategory?: string): Observable<VideoScriptResponse> {
    return this.http.post<VideoScriptResponse>(
      `${this.quizBase}/modules/${moduleId}/video-script?language=${language}`,
      { moduleTitle: moduleTitle ?? '', moduleCategory: moduleCategory ?? '' }
    ).pipe(catchError(this.handleError));
  }

  /**
   * 4. RAPPORT DE COMPÉTENCES
   * Récupère les stats d'apprentissage pour un module spécifique.
   */
  getSkillReport(moduleId: string | number): Observable<any> {
    return this.http.get(`${this.reportBase}/${moduleId}`)
      .pipe(catchError(this.handleError));
  }

  // ── GESTION DES ERREURS ───────────────────────────────────────────────────
  
  private handleError(error: any): Observable<never> {
    console.error('AiService Error:', error);
    const msg = error?.error?.message || error?.message || 'Erreur du service IA';
    return throwError(() => new Error(msg));
  }
}