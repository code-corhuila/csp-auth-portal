import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../../shell-contract';
import { BILLBOARD_PATH, LOGIN_PATH } from '../auth-paths';
import { AuthSessionService } from '../data/session-store';
import { Role } from '../model/user';

/**
 * The guards only decide what the interface shows, from the roles the session held when it started; the
 * server is the one that authorizes every call. When a guarded screen's call is refused (401 or 403) the
 * session may no longer deserve the screen (a revoked ADMIN, a closed session), so the roles are renewed
 * from the server and the screen is left if the session no longer passes: to login when there is no
 * session, to the billboard when the required role is gone. Any other failure is left to the screen.
 */
@Injectable({ providedIn: 'root' })
export class AccessRecheck {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  /** Never rejects: it is called from error handlers that have nothing to do with its outcome. */
  async afterRefusal(error: ApiError, requiredRole?: Role): Promise<void> {
    if (error.status !== 401 && error.status !== 403) {
      return;
    }
    await this.session.refresh();
    if (!this.session.isAuthenticated()) {
      await this.router.navigate([LOGIN_PATH], { queryParams: { returnUrl: this.router.url } });
    } else if (requiredRole !== undefined && !this.session.hasRole(requiredRole)) {
      await this.router.navigateByUrl(BILLBOARD_PATH);
    }
  }
}
