import { computed, Injectable, signal } from '@angular/core';
import { AuthResponse } from '../model/auth';
import { Role, UserSummary } from '../model/user';

/** In-memory session of the portal: nothing is persisted, a reload ends it. */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly current = signal<UserSummary | null>(null);

  readonly user = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  start(response: AuthResponse): void {
    this.current.set(response.user);
  }

  end(): void {
    this.current.set(null);
  }

  hasRole(role: Role): boolean {
    return this.current()?.roles.includes(role) ?? false;
  }
}
