import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { AuthResponse } from '../model/auth';
import { Role, UserSummary } from '../model/user';
import { ToastService } from '../ui/toast.service';
import { AuthApiService } from './auth-api.service';
import { RefreshTokenStore } from './refresh-token-store';

/** The access token is renewed this long before it expires, and never sooner than MIN_RENEWAL_DELAY_SECONDS from now. */
const RENEWAL_MARGIN_SECONDS = 60;
const MIN_RENEWAL_DELAY_SECONDS = 5;

const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Inicia sesión de nuevo.';
const RENEWAL_FAILED_MESSAGE = 'No pudimos renovar tu sesión por un problema de conexión. Recarga la página para reintentar.';

/**
 * Session of the portal. The user and the access token live in memory; the refresh token is kept by
 * RefreshTokenStore (sessionStorage), so a reload restores the session with POST /auth/refresh and the
 * access token is renewed shortly before it expires. The shell reads it through the federated './session'
 * to know who signed in, to send the access token, to restore the session at startup and to sign out.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly api = inject(AuthApiService);
  private readonly refreshTokens = inject(RefreshTokenStore);
  private readonly toasts = inject(ToastService);
  private readonly current = signal<UserSummary | null>(null);
  private readonly token = signal<string | null>(null);
  private renewal: ReturnType<typeof setTimeout> | null = null;
  private pending: Promise<void> | null = null;
  private generation = 0;

  readonly user = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  start(response: AuthResponse): void {
    this.current.set(response.user);
    this.token.set(response.accessToken);
    this.refreshTokens.save(response.refreshToken);
    this.scheduleRenewal(response.expiresIn);
  }

  /** Ends the session in memory and forgets the kept refresh token. */
  end(): void {
    this.suspend();
    this.refreshTokens.clear();
  }

  /**
   * Restores the session of a previous page load with the kept refresh token. Resolves when the attempt
   * finished, whatever the outcome, and never rejects: the caller only waits before its first navigation.
   */
  async restore(): Promise<void> {
    if (this.refreshTokens.read() !== null) {
      await this.refresh();
    }
  }

  /** Renews the tokens. Concurrent callers share one request; it never rejects. */
  refresh(): Promise<void> {
    this.pending ??= this.renew().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  /**
   * Revokes the refresh token in the API and ends the session even if that call fails. The request is sent
   * (with the access token still set) and the session is forgotten right after, without waiting for the
   * answer: if the page is left meanwhile the browser cancels the request, and a refresh token still stored
   * would restore the session on the next load.
   */
  async signOut(): Promise<void> {
    const refreshToken = this.refreshTokens.read();
    const revocation = refreshToken === null ? null : firstValueFrom(this.api.logout({ refreshToken }));
    this.end();
    try {
      await revocation;
    } catch {
      // The person is leaving: a failed revocation must not keep the session open on this device.
    }
  }

  /** Shows the confirmed address after an email change; the tokens do not carry the email, so the session keeps working. */
  updateEmail(email: string): void {
    this.current.update(user => (user === null ? user : { ...user, email }));
  }

  hasRole(role: Role): boolean {
    return this.current()?.roles.includes(role) ?? false;
  }

  /** The access token of the signed-in user, or null without a session. */
  accessToken(): string | null {
    return this.token();
  }

  private async renew(): Promise<void> {
    const refreshToken = this.refreshTokens.read();
    if (refreshToken === null) {
      return;
    }
    const generation = this.generation;
    try {
      const response = await firstValueFrom(this.api.refresh({ refreshToken }));
      if (generation === this.generation) {
        this.start(response);
      }
    } catch (err) {
      if (generation === this.generation) {
        this.handleRenewalFailure(asApiError(err).status);
      }
    }
  }

  /**
   * A rejected token (401) or a locked account (423) ends the session for good; anything else may pass.
   * Only a person in an active session is told: a failed restore at page load is silent.
   */
  private handleRenewalFailure(status: number): void {
    const wasActive = this.isAuthenticated();
    const rejected = status === 401 || status === 423;
    if (rejected) {
      this.end();
    } else {
      this.suspend();
    }
    if (wasActive) {
      this.toasts.show(rejected ? SESSION_EXPIRED_MESSAGE : RENEWAL_FAILED_MESSAGE, 'error');
    }
  }

  /** Ends the session in memory only; the refresh token stays so a reload can try again. */
  private suspend(): void {
    this.generation++;
    this.cancelRenewal();
    this.current.set(null);
    this.token.set(null);
  }

  private scheduleRenewal(expiresInSeconds: number): void {
    this.cancelRenewal();
    const delaySeconds = Math.max(expiresInSeconds - RENEWAL_MARGIN_SECONDS, MIN_RENEWAL_DELAY_SECONDS);
    this.renewal = setTimeout(() => void this.refresh(), delaySeconds * 1000);
  }

  private cancelRenewal(): void {
    if (this.renewal !== null) {
      clearTimeout(this.renewal);
      this.renewal = null;
    }
  }
}
