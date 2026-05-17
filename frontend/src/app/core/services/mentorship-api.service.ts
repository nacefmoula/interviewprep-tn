import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    MentorRequest,
    MentorSession,
    MentorScoreDTO,
    CreateMentorRequestDTO,
    CreateMentorSessionDTO
} from '../models/models';

export interface MyMentorRating {
    mentorId: string;
    stars: number;
    comment: string | null;
    sessionId: string | null;
}

@Injectable({ providedIn: 'root' })
export class MentorshipApiService {
    private http = inject(HttpClient);
    private api = environment.mentorshipApiUrl;

    getMentors(): Observable<any> {
        // This returns a paginated response from user-service
        return this.http.get<any>(`${environment.apiUrl}/api/users/by-role?role=MENTOR`);
    }

    getRecommendations(): Observable<MentorScoreDTO[]> {
        return this.http.get<MentorScoreDTO[]>(`${this.api}/api/recommendations`);
    }

    chatRecommendation(mentorId: string, message: string): Observable<{ reply: string }> {
        return this.http.post<{ reply: string }>(`${this.api}/api/recommendations/chat`, {
            mentorId,
            message,
        });
    }

    sendRequest(dto: CreateMentorRequestDTO): Observable<MentorRequest> {
        return this.http.post<MentorRequest>(`${this.api}/api/mentor-requests`, dto);
    }

    getRequestsByMentee(menteeKeycloakId: string): Observable<MentorRequest[]> {
        return this.http.get<MentorRequest[]>(`${this.api}/api/mentor-requests/mentee/${menteeKeycloakId}`);
    }

    getRequestsByMentor(mentorKeycloakId: string): Observable<MentorRequest[]> {
        return this.http.get<MentorRequest[]>(`${this.api}/api/mentor-requests/mentor/${mentorKeycloakId}`);
    }

    getAllRequests(): Observable<MentorRequest[]> {
        return this.http.get<MentorRequest[]>(`${this.api}/api/mentor-requests`);
    }

    acceptRequest(requestId: string): Observable<MentorRequest> {
        return this.http.put<MentorRequest>(`${this.api}/api/mentor-requests/${requestId}/accept`, {});
    }

    declineRequest(requestId: string): Observable<MentorRequest> {
        return this.http.put<MentorRequest>(`${this.api}/api/mentor-requests/${requestId}/decline`, {});
    }

    deleteRequest(requestId: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/api/mentor-requests/${requestId}`);
    }

    createSession(dto: CreateMentorSessionDTO): Observable<MentorSession> {
        return this.http.post<MentorSession>(`${this.api}/api/mentor-sessions`, dto);
    }

    getSessionsByRequest(requestId: string): Observable<MentorSession[]> {
        return this.http.get<MentorSession[]>(`${this.api}/api/mentor-sessions/request/${requestId}`);
    }

    getAllSessions(): Observable<MentorSession[]> {
        return this.http.get<MentorSession[]>(`${this.api}/api/mentor-sessions`);
    }

    completeSession(sessionId: string): Observable<MentorSession> {
        return this.http.put<MentorSession>(`${this.api}/api/mentor-sessions/${sessionId}/complete`, {});
    }

    cancelSession(sessionId: string): Observable<MentorSession> {
        return this.http.put<MentorSession>(`${this.api}/api/mentor-sessions/${sessionId}/cancel`, {});
    }

    deleteSession(sessionId: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/api/mentor-sessions/${sessionId}`);
    }

    updateSession(sessionId: string, scheduledAt: string, meetingLink: string): Observable<MentorSession> {
        return this.http.put<MentorSession>(`${this.api}/api/mentor-sessions/${sessionId}`, {
            scheduledAt,
            meetingLink
        });
    }


    getMentorStats(mentorId: string): Observable<{ completedSessions: number; averageRating: number; totalRatings: number }> {
        return this.http.get<any>(`${this.api}/api/mentor-ratings/mentor/${mentorId}/stats`);
    }

    getMyRatings(): Observable<MyMentorRating[]> {
        return this.http.get<MyMentorRating[]>(`${this.api}/api/mentor-ratings/me`);
    }

    rateMentor(mentorId: string, stars: number, comment: string, sessionId?: string | null): Observable<any> {
        const body: any = { stars, comment };
        if (sessionId) body.sessionId = sessionId;
        return this.http.post(`${this.api}/api/mentor-ratings/mentor/${mentorId}`, body);
    }

    unrateMentor(mentorId: string): Observable<void> {
        return this.http.delete<void>(`${this.api}/api/mentor-ratings/mentor/${mentorId}`);
    }
}