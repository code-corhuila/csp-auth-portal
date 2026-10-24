import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiError, asApiError } from '../../shell-contract';
import { AuthResponse, EmailChangeRequest, EmailVerificationRequest, ForgotPasswordRequest, LoginRequest, LogoutRequest, RefreshRequest, RegisterRequest, ResetPasswordRequest } from '../model/auth';

const BASE = '/api/v1/auth';

/**
 * Typed calls to csp-auth-api (auth-service 1.7.0). The injected HttpClient is the SHELL's:
 * its interceptor completes the '/api/v1/...' path, attaches the correlation id and
 * normalises every error. The portal never compares or keeps a password.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/login`, request).pipe(
      catchError(err => throwError(() => withMessage(err, loginMessage))),
    );
  }

  /** The contract rotates the refresh token: the answer carries the new one and the sent one stops working. */
  refresh(request: RefreshRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/refresh`, request);
  }

  /** Needs the Bearer token, which the shell's interceptor adds; revokes the refresh token sent. */
  logout(request: LogoutRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/logout`, request);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/register`, request, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    }).pipe(
      catchError(err => throwError(() => withMessage(err, registerMessage))),
    );
  }

  /** The contract answers 202 whether or not the account exists; the operation takes no Idempotency-Key (ADR-050). */
  requestPasswordReset(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/forgot-password`, request);
  }

  /**
   * 204 when the token sets the new password; 401 INVALID_TOKEN has one body for an unknown, expired, used or superseded token.
   * No Idempotency-Key: the token is single use (ADR-050). The token is never logged.
   */
  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/reset-password`, request);
  }

  /**
   * Needs the Bearer token and a fresh Idempotency-Key, which the contract requires and the API validates (8 to 128 characters).
   * The contract answers 202 with no body; the code goes to the new address, never to this response.
   */
  requestEmailChange(request: EmailChangeRequest): Observable<void> {
    return this.http.patch<void>(`${BASE}/me/email`, request, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  }

  /**
   * Needs the Bearer token and a fresh Idempotency-Key (required by the contract). 204 when the code confirms the pending change;
   * every cause of an invalid code is the same 400.
   */
  verifyEmailChange(request: EmailVerificationRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/me/email/verify`, request, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  }
}

function withMessage(err: unknown, messageFor: (error: ApiError) => string | undefined): ApiError {
  const error = asApiError(err);
  return { ...error, userMessage: messageFor(error) ?? error.userMessage };
}

function loginMessage(error: ApiError): string | undefined {
  if (error.status === 401) {
    return 'Correo o contraseña incorrectos.';
  }
  if (error.status === 423) {
    return 'Tu cuenta está bloqueada temporalmente. Inténtalo más tarde.';
  }
  return error.status === 429 ? rateLimitedMessage(error.retryAfterSeconds) : undefined;
}

function rateLimitedMessage(retryAfterSeconds: number | undefined): string {
  if (retryAfterSeconds === undefined) {
    return 'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.';
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Demasiados intentos fallidos. Inténtalo de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
}

function registerMessage(error: ApiError): string | undefined {
  return error.code === 'EMAIL_ALREADY_REGISTERED' ? 'Este correo ya está registrado.' : undefined;
}
