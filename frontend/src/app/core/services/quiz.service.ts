

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable ,throwError} from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OralEvalRequest {
  questionText: string;
  correctAnswer: string;
  userTranscription: string;
  language: string;
}
 
export interface OralEvalResponse {
  score: number;       // 0-100
  feedback: string;    // explication pédagogique de l'IA
  isCorrect: boolean;  // score >= 60
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private http = inject(HttpClient);
  
  private apiUrl = `${environment.quizApiUrl}/api`;

  // --- Gestion des Quiz (QuizController) ---

  getQuizzes(): Observable<any> {
    // Java: @GetMapping("/api/quizzes")
    return this.http.get(`${this.apiUrl}/quizzes`);
  }

  getAdminQuizzes(): Observable<any> {
    // Java: @GetMapping("/api/quizzes/admin/all")
    return this.http.get(`${this.apiUrl}/quizzes/admin/all`);
  }

  getQuizById(id: string): Observable<any> {
    // Java: @GetMapping("/api/quizzes/{id}")
    return this.http.get(`${this.apiUrl}/quizzes/${id}`);
  }

  createQuiz(quiz: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/quizzes`, quiz);
  }

  updateQuiz(id: string, data: any): Observable<any> {
    // CORRECTION : On reste sur le port 8082 (le 8081 est pour le User Service !)
    return this.http.put(`${this.apiUrl}/quizzes/${id}`, data);
  }

  deleteQuiz(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/quizzes/${id}`);
  }

  // --- Gestion des Tentatives (AttemptController) ---
startQuiz(quizId: string): Observable<any> {
  // Protection : refuser les IDs numériques (ancien format)
  if (!quizId || !isNaN(Number(quizId))) {
    console.error('startQuiz: ID invalide (nombre au lieu de UUID):', quizId);
    return throwError(() => new Error('ID quiz invalide: ' + quizId));
  }
  return this.http.post<any>(`${this.apiUrl}/quizzes/${quizId}/start`, {});
}

  submitAttempt(attemptId: string, payload: any): Observable<any> {
    // Java: @PostMapping("/api/attempts/{attemptId}/submit")
    return this.http.post<any>(`${this.apiUrl}/attempts/${attemptId}/submit`, payload);
  }

  getMyAttempts(): Observable<any> {
    // Java: @GetMapping("/api/attempts/my")
    return this.http.get(`${this.apiUrl}/attempts/my`);
  }

  // Dans quiz.service.ts
// ✅
publishQuiz(id: string): Observable<void> {
  return this.http.patch<void>(`${this.apiUrl}/quizzes/${id}/publish`, {});
}
// ── NOUVEAU — Évaluation IA de la réponse orale ──────────────────
  /**
   * POST /api/quizzes/ai/evaluate-oral
   *
   * Envoie la transcription vocale à Groq pour une évaluation
   * sémantique précise : tolère les paraphrases, pénalise les
   * inexactitudes factuelles, retourne un score 0-100 + feedback.
   */
  evaluateOral(req: OralEvalRequest): Observable<OralEvalResponse> {
    return this.http.post<OralEvalResponse>(
      `${this.apiUrl}/quizzes/ai/evaluate-oral`,
      req
    );
  }

  // Dans votre QuizService
getQuizzesByModule(moduleId: string): Observable<any> {
  // Vérifie que moduleId est un UUID valide
  if (!moduleId) {
    return throwError(() => new Error('ModuleId est requis pour filtrer les quiz'));
  }
  
  // Appelle l'URL Java : @GetMapping("/api/quizzes/module/{moduleId}")
  return this.http.get<any>(`${this.apiUrl}/quizzes/module/${moduleId}`);
}
}