import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, catchError, map, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import {
    BadgeResponse,
    CreateDailyActivityRequest,
    CreateTrainingPathRequest,
    DailyActivityResponse,
    TrainingModuleResponse,
    TrainingPathResponse,
    TrainingPreferencesRequest,
    TrainingPreferencesResponse,
    UpdateModuleProgressRequest,
    UserBadgeResponse,
    UserXPTrackerResponse,
} from "../models/training.models";

@Injectable({ providedIn: "root" })
export class TrainingApiService {
    private http = inject(HttpClient);
    private baseUrl = environment.trainingApiUrl;

    getPathByUserId(userId: string): Observable<TrainingPathResponse> {
        return this.http.get<TrainingPathResponse>(
            `${this.baseUrl}/api/v1/training/paths/user/${userId}`,
        );
    }

    createPath(request: CreateTrainingPathRequest): Observable<TrainingPathResponse> {
        return this.http.post<TrainingPathResponse>(
            `${this.baseUrl}/api/v1/training/paths`,
            request,
        );
    }

    getOrCreatePath(userId: string): Observable<TrainingPathResponse> {
        return this.getPathByUserId(userId).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 404) {
                    return this.createPath({
                        userId,
                        status: "ACTIVE",
                        xpThreshold: 200,
                    }).pipe(
                        catchError((createError: HttpErrorResponse) => {
                            // Race condition guard: if another request created the path first,
                            // simply load the existing one instead of failing the page.
                            if (createError.status === 422) {
                                return this.getPathByUserId(userId);
                            }
                            return throwError(() => createError);
                        }),
                    );
                }
                return throwError(() => error);
            }),
        );
    }

    generateMyPath(): Observable<TrainingPathResponse> {
        return this.http.post<TrainingPathResponse>(
            `${this.baseUrl}/api/v1/training/paths/generate`,
            null,
        );
    }

    createNewMyPath(): Observable<TrainingPathResponse> {
        return this.http.post<TrainingPathResponse>(
            `${this.baseUrl}/api/v1/training/paths/new`,
            null,
        );
    }

    getMyPathHistory(): Observable<TrainingPathResponse[]> {
        return this.http.get<TrainingPathResponse[]>(
            `${this.baseUrl}/api/v1/training/paths/me/history`,
        );
    }

    getMyPreferences(): Observable<TrainingPreferencesResponse> {
        return this.http.get<TrainingPreferencesResponse>(
            `${this.baseUrl}/api/v1/training/preferences/me`,
        );
    }

    putMyPreferences(
        request: TrainingPreferencesRequest,
    ): Observable<TrainingPreferencesResponse> {
        return this.http.put<TrainingPreferencesResponse>(
            `${this.baseUrl}/api/v1/training/preferences/me`,
            request,
        );
    }

    updateModuleProgress(
        pathId: number,
        moduleId: number,
        userId: string,
        request: UpdateModuleProgressRequest,
    ): Observable<TrainingModuleResponse> {
        return this.http.put<TrainingModuleResponse>(
            `${this.baseUrl}/api/v1/training/paths/${pathId}/modules/${moduleId}?userId=${encodeURIComponent(userId)}`,
            request,
        );
    }

    recordDailyActivity(
        request: CreateDailyActivityRequest,
    ): Observable<UserXPTrackerResponse> {
        return this.http.post<UserXPTrackerResponse>(
            `${this.baseUrl}/api/v1/training/activities`,
            request,
        );
    }

    getTodayActivity(userId: string): Observable<DailyActivityResponse> {
        return this.http.get<DailyActivityResponse>(
            `${this.baseUrl}/api/v1/training/activities/user/${encodeURIComponent(userId)}/today`,
        );
    }

    getLeaderboard(topN = 10): Observable<UserXPTrackerResponse[]> {
        return this.http.get<UserXPTrackerResponse[]>(
            `${this.baseUrl}/api/v1/training/leaderboard?topN=${topN}`,
        );
    }

    getUserXpTracker(userId: string): Observable<UserXPTrackerResponse> {
        return this.http.get<UserXPTrackerResponse>(
            `${this.baseUrl}/api/v1/training/xp-tracker/user/${encodeURIComponent(userId)}`,
        );
    }

    getActiveBadges(): Observable<BadgeResponse[]> {
        return this.http.get<BadgeResponse[]>(
            `${this.baseUrl}/api/v1/training/badges`,
        );
    }

    getUserBadges(userId: string): Observable<UserBadgeResponse[]> {
        return this.http.get<UserBadgeResponse[]>(
            `${this.baseUrl}/api/v1/training/user-badges/user/${encodeURIComponent(userId)}`,
        );
    }

    getAllTrainingModules(): Observable<TrainingModuleResponse[]> {
        return this.http.get<TrainingModuleResponse[]>(
            `${this.baseUrl}/api/v1/admin/training/modules`,
        ).pipe(
            catchError(() =>
                this.http.get<TrainingPathResponse[]>(
                    `${this.baseUrl}/api/v1/training/paths/me/history`,
                ).pipe(
                    map((paths: TrainingPathResponse[]) => {
                        const seen = new Set<number>();
                        return paths
                            .flatMap(p => p.modules ?? [])
                            .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
                    }),
                )
            )
        );
    }
}
