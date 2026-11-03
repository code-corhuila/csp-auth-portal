import { Injectable } from '@angular/core';

const STORAGE_KEY = 'csp.auth.refresh';
const WELL_FORMED = /^\S+$/;

/**
 * Keeps the refresh token for the life of the browser tab: sessionStorage, never localStorage, so closing the
 * tab ends the session. The in-memory copy keeps the rotation working when the storage is unavailable.
 * The value is never logged.
 */
@Injectable({ providedIn: 'root' })
export class RefreshTokenStore {
  private memory: string | null = null;

  save(token: string): void {
    this.memory = token;
    this.write(token);
  }

  /** The kept token, or null when there is none or the stored value is not a well-formed token. */
  read(): string | null {
    if (this.memory !== null) {
      return this.memory;
    }
    const stored = this.fromStorage();
    return stored !== null && WELL_FORMED.test(stored) ? stored : null;
  }

  clear(): void {
    this.memory = null;
    this.write(null);
  }

  private fromStorage(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private write(token: string | null): void {
    try {
      if (token === null) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, token);
      }
    } catch {
      // Storage unavailable (blocked or full): the in-memory copy still serves this page load.
    }
  }
}
