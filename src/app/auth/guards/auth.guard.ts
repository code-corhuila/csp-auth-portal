import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LOGIN_PATH } from '../auth-paths';
import { AuthSessionService } from '../data/session-store';

/** Anonymous visitors go to login and come back to the route they asked for. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthSessionService).isAuthenticated()
    ? true
    : router.createUrlTree([LOGIN_PATH], { queryParams: { returnUrl: state.url } });
};
