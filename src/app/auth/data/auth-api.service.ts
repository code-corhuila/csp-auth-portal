import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiError, asApiError } from '../../shell-contract';
import { AuthResponse, ForgotPasswordRequest, LoginRequest, RegisterRequest } from '../model/auth';

const BASE = '/api/v1/auth';

/**
 * Typed calls to csp-auth-api (auth-service 1.5.0). The injected HttpClient is the SHELL's:
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
