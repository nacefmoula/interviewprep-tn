import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    plan: string;
    status: string;
    isVerified: boolean;
    karmaPoints: number;
    bio: string;
    avatarUrl: string;
    cvUrl?: string | null;
    city: string;
    phoneNumber?: string;
    preferredIndustry: string;
    preferredLanguage: string;
    skills: string[];
    experiencesJson?: string;
    educationsJson?: string;
    simulationsUsedThisMonth: number;
    simulationsLimit: number;
    subscriptionActive: boolean;
    subscriptionStart?: string;
    subscriptionEnd?: string;
    emailNotificationsEnabled?: boolean;
    pushNotificationsEnabled?: boolean;
    profileVisible?: boolean;
    createdAt: string;
    updatedAt: string;
    cvParsingApplied?: boolean | null;
}

@Injectable({ providedIn: "root" })
export class UserApiService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    getCurrentUser(): Observable<UserProfile> {
        return this.http.get<UserProfile>(`${this.apiUrl}/api/users/me`);
    }

    updateCurrentUser(data: Record<string, unknown>): Observable<UserProfile> {
        return this.http.put<UserProfile>(`${this.apiUrl}/api/users/me`, data);
    }

    getUserById(id: string): Observable<UserProfile> {
        return this.http.get<UserProfile>(`${this.apiUrl}/api/users/${id}`);
    }

    uploadCv(file: File): Observable<UserProfile> {
        const formData = new FormData();
        formData.append("file", file);
        return this.http.post<UserProfile>(
            `${this.apiUrl}/api/users/me/cv`,
            formData,
        );
    }

    toggleAvailability(userId: string, status: string): Observable<UserProfile> {
        return this.http.patch<UserProfile>(
            `${this.apiUrl}/api/users/${userId}/availability?status=${status}`,
            {}
        );
    }
}
