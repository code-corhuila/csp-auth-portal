import { computed, Injectable, signal } from '@angular/core';
import { AuthResponse } from '../model/auth';
import { Role, UserSummary } from '../model/user';

/**
 * In-memory session of the portal: nothing is persisted, a reload ends it.
 * The shell reads it through the federated './session' to know who signed in and to send the access token.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly current = signal<UserSummary | null>(null);
  private readonly token = signal<string | null>(null);

  readonly user = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  start(response: AuthResponse): void {
    this.current.set(response.user);
    this.token.set(response.accessToken);
  }

  end(): void {
    this.current.set(null);
    this.token.set(null);
  }

  hasRole(role: Role): boolean {
    return this.current()?.roles.includes(role) ?? false;
  }

  /** The access token of the signed-in user, or null without a session. */
  accessToken(): string | null {
    return this.token();
  }
}
