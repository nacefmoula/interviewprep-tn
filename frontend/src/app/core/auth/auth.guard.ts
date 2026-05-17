import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);

  // Defensive: ensure Keycloak init has completed before reading auth state
  // (the appInitializer normally awaits this, but the guard must not depend
  // on bootstrap ordering — F3).
  if (!authService.isInitialized()) {
    await authService.init();
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Preserve the originally requested URL so the user returns there after
  // login instead of always landing on /dashboard (F3).
  authService.login(state.url);
  return false;
};
