import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BILLBOARD_PATH } from '../auth-paths';
import { AuthSessionService } from '../data/session-store';
import { authGuard } from './auth.guard';

/**
 * /admin requires the ADMIN role; any other session is sent to the billboard. This only decides what the interface
 * shows: the API authorizes every call, and AccessRecheck leaves the screen when it refuses one.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authenticated = authGuard(route, state);
  if (authenticated !== true) {
    return authenticated;
  }
  return inject(AuthSessionService).hasRole('ADMIN') || inject(Router).createUrlTree([BILLBOARD_PATH]);
};
