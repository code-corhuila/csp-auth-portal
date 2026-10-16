import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiError, asApiError } from '../../shell-contract';
import { AuthResponse, EmailChangeRequest, EmailVerificationRequest, ForgotPasswordRequest, LoginRequest, LogoutRequest, RefreshRequest, RegisterRequest } from '../model/auth';

const BASE = '/api/v1/auth';

/**
 * Typed calls to csp-auth-api (auth-service 1.6.0). The injected HttpClient is the SHELL's:
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

  /** The contract answers 202 whether or not the account exists. */
  requestPasswordReset(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/forgot-password`, request);
  }

  /** Needs the Bearer token. The contract answers 202 with no body; the code goes to the new address, never to this response. */
  requestEmailChange(request: EmailChangeRequest): Observable<void> {
    return this.http.patch<void>(`${BASE}/me/email`, request);
  }

  /** Needs the Bearer token. 204 when the code confirms the pending change; every cause of an invalid code is the same 400. */
  verifyEmailChange(request: EmailVerificationRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/me/email/verify`, request);
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
  return error.status === 423 ? 'Tu cuenta está bloqueada temporalmente. Inténtalo más tarde.' : undefined;
}

function registerMessage(error: ApiError): string | undefined {
  return error.code === 'EMAIL_ALREADY_REGISTERED' ? 'Este correo ya está registrado.' : undefined;
}
