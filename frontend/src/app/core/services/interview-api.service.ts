import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import {
    InterviewSessionResponse,
    CreateSessionRequest,
    Question,
    SubmitResponseRequest,
    SubmitResponseResult,
    PerformanceReport,
    ProgressTracker,
} from "../models/interview.models";

@Injectable({ providedIn: "root" })
export class InterviewApiService {
    private http = inject(HttpClient);
    private base = environment.interviewApiUrl;

    // ── Sessions (user) ───────────────────────────────────────────────────────

    createSession(
        req: CreateSessionRequest,
    ): Observable<InterviewSessionResponse> {
        return this.http.post<InterviewSessionResponse>(
            `${this.base}/api/interview-sessions`,
            req,
        );
    }

    getMySessions(): Observable<InterviewSessionResponse[]> {
        return this.http.get<InterviewSessionResponse[]>(
            `${this.base}/api/interview-sessions/me`,
        );
    }

    getSession(id: number): Observable<InterviewSessionResponse> {
        return this.http.get<InterviewSessionResponse>(
            `${this.base}/api/interview-sessions/${id}`,
        );
    }

    pauseSession(id: number): Observable<InterviewSessionResponse> {
        return this.http.post<InterviewSessionResponse>(
            `${this.base}/api/interview-sessions/${id}/pause`,
            {},
        );
    }

    resumeSession(id: number): Observable<InterviewSessionResponse> {
        return this.http.post<InterviewSessionResponse>(
            `${this.base}/api/interview-sessions/${id}/resume`,
            {},
        );
    }

    completeSession(id: number): Observable<InterviewSessionResponse> {
        return this.http.post<InterviewSessionResponse>(
            `${this.base}/api/interview-sessions/${id}/complete`,
            {},
        );
    }

    cancelSession(id: number): Observable<InterviewSessionResponse> {
        return this.http.post<InterviewSessionResponse>(
            `${this.base}/api/interview-sessions/${id}/cancel`,
            {},
        );
    }

    /** User deletes their own session permanently. */
    deleteSession(id: number): Observable<void> {
        return this.http.delete<void>(
            `${this.base}/api/interview-sessions/${id}`,
        );
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    getNextQuestion(sessionId: number): Observable<Question> {
        return this.http.get<Question>(
            `${this.base}/api/interview-sessions/${sessionId}/next-question`,
        );
    }

    // ── Responses ─────────────────────────────────────────────────────────────

    submitResponse(
        sessionId: number,
        req: SubmitResponseRequest,
    ): Observable<SubmitResponseResult> {
        return this.http.post<SubmitResponseResult>(
            `${this.base}/api/interview-sessions/${sessionId}/responses`,
            req,
        );
    }

    // ── Report ────────────────────────────────────────────────────────────────

    getReport(sessionId: number): Observable<PerformanceReport> {
        return this.http.get<PerformanceReport>(
            `${this.base}/api/interview-sessions/${sessionId}/report`,
        );
    }

    // ── Progress ──────────────────────────────────────────────────────────────

    getMyProgress(): Observable<ProgressTracker> {
        return this.http.get<ProgressTracker>(`${this.base}/api/progress/me`);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    adminGetSessionsByUser(
        userId: string,
    ): Observable<InterviewSessionResponse[]> {
        return this.http.get<InterviewSessionResponse[]>(
            `${this.base}/api/interview-sessions/admin/by-user/${userId}`,
        );
    }

    adminGetReport(sessionId: number): Observable<PerformanceReport> {
        return this.http.get<PerformanceReport>(
            `${this.base}/api/interview-sessions/admin/${sessionId}/report`,
        );
    }

    adminDeleteSession(id: number): Observable<void> {
        return this.http.delete<void>(
            `${this.base}/api/interview-sessions/admin/${id}`,
        );
    }

    adminGetProgress(userId: string): Observable<ProgressTracker> {
        return this.http.get<ProgressTracker>(
            `${this.base}/api/progress/admin/${userId}`,
        );
    }
}
