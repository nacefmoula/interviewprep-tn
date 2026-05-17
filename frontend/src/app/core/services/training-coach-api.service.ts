import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TrainingCoachRole = 'user' | 'assistant' | 'system';

export interface TrainingCoachMessage {
  role: TrainingCoachRole;
  content: string;
}

export interface TrainingCoachChatRequest {
  message: string;
  history?: TrainingCoachMessage[];
}

export interface TrainingCoachChatResponse {
  reply: string;
  model: string;
}

@Injectable({ providedIn: 'root' })
export class TrainingCoachApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  chat(message: string, history: TrainingCoachMessage[] = []): Observable<TrainingCoachChatResponse> {
    const payload: TrainingCoachChatRequest = { message, history };
    return this.http.post<TrainingCoachChatResponse>(`${this.apiUrl}/api/ai/training-coach/chat`, payload);
  }
}
