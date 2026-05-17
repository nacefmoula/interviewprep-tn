import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { catchError, from, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Origins the Keycloak bearer token may be attached to. Derived ONLY from the
 * configured backend API URLs — never Keycloak, Kokoro, Simli or any third
 * party. Previously the token was added to every outbound request when the
 * user was authenticated (F7), leaking it to any host the app called.
 */
const TRUSTED_ORIGINS: ReadonlySet<string> = new Set(
  [
    environment.apiUrl,
    environment.interviewApiUrl,
    environment.trainingApiUrl,
    environment.mentorshipApiUrl,
    environment.quizApiUrl,
    environment.communityApiUrl,
    environment.resourceApiUrl,
  ]
    .filter((u): u is string => !!u)
    .map((u) => {
      try {
        return new URL(u).origin;
      } catch {
        return '';
      }
    })
    .filter((o) => o !== ''),
);

function isTrustedUrl(url: string): boolean {
  // Relative URL (single leading slash, not protocol-relative "//") stays on
  // the SPA's own origin — safe.
  if (/^\/(?!\/)/.test(url)) {
    return true;
  }
  try {
    return TRUSTED_ORIGINS.has(new URL(url, window.location.origin).origin);
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const onError = (err: unknown) => {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      // Token rejected/expired — re-authenticate (full redirect, no loop).
      authService.login();
    }
    return throwError(() => err);
  };

  if (!authService.isAuthenticated() || !isTrustedUrl(req.url)) {
    return next(req).pipe(catchError(onError));
  }

  return from(authService.getToken()).pipe(
    catchError(() => of('')),
    switchMap((token) => {
      const authReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      return next(authReq).pipe(catchError(onError));
    }),
  );
};
