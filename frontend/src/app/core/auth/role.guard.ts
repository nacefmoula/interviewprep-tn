import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard factory: allows activation only if the authenticated user has
 * at least one of the given roles. Use alongside authGuard, e.g.
 * `canActivate: [authGuard, roleGuard('ADMIN')]`.
 *
 * Role matching delegates to AuthService.hasRole, which already normalizes
 * the ROLE_ prefix and case the same way the backend JwtAuthConverter does.
 * This is defence-in-depth only — backend @PreAuthorize/SecurityConfig
 * remains the authoritative check.
 */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return (): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      authService.login();
      return false;
    }

    const allowed = allowedRoles.some((role) => authService.hasRole(role));
    return allowed ? true : router.createUrlTree(['/dashboard']);
  };
}
