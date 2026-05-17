import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";
import { of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { CurrentUserStoreService } from "../services/current-user-store.service";
import { UserApiService, UserProfile } from "../services/user-api.service";

export const currentUserResolver: ResolveFn<UserProfile | null> = () => {
    const userApi = inject(UserApiService);
    const currentUserStore = inject(CurrentUserStoreService);

    return userApi.getCurrentUser().pipe(
        tap((user) => currentUserStore.setCurrentUser(user)),
        catchError((err) => {
            console.error("Resolver failed to load current user", err);
            currentUserStore.setCurrentUser(null);
            return of(null);
        }),
    );
};
