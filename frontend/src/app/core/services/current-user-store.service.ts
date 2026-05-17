import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { UserApiService, UserProfile } from "./user-api.service";

@Injectable({ providedIn: "root" })
export class CurrentUserStoreService {
    private userApi = inject(UserApiService);

    private readonly currentUserSubject =
        new BehaviorSubject<UserProfile | null>(null);
    private readonly initializedSubject = new BehaviorSubject<boolean>(false);
    private loading = false;

    readonly currentUser$ = this.currentUserSubject.asObservable();
    readonly initialized$ = this.initializedSubject.asObservable();

    get currentUser(): UserProfile | null {
        return this.currentUserSubject.value;
    }

    get initialized(): boolean {
        return this.initializedSubject.value;
    }

    loadCurrentUser(force = false): Observable<UserProfile | null> {
        if (!force && this.initializedSubject.value) {
            return of(this.currentUserSubject.value);
        }

        if (this.loading && !force) {
            return of(this.currentUserSubject.value);
        }

        this.loading = true;

        return this.userApi.getCurrentUser().pipe(
            tap((user) => {
                this.currentUserSubject.next(user);
                this.initializedSubject.next(true);
                this.loading = false;
            }),
            catchError((err) => {
                console.error("Failed to load current user", err);
                this.currentUserSubject.next(null);
                this.initializedSubject.next(true);
                this.loading = false;
                return of(null);
            }),
        );
    }

    refreshCurrentUser(): Observable<UserProfile | null> {
        return this.loadCurrentUser(true);
    }

    setCurrentUser(user: UserProfile | null): void {
        this.currentUserSubject.next(user);
        this.initializedSubject.next(true);
    }

    clear(): void {
        this.currentUserSubject.next(null);
        this.initializedSubject.next(false);
        this.loading = false;
    }
}
