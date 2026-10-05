import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthResponse, ForgotPasswordRequest, LoginRequest, RegisterRequest } from '../model/auth';
import { SyntheticUser, SYNTHETIC_USERS } from './synthetic-users';

const EXPIRES_IN_SECONDS = 3600;

/**
 * Cut 2: answers from the burned-in dataset, with no HTTP and no HttpClient of its own.
 * The real calls go through the SHELL's client against the relative paths
 * POST /api/v1/auth/login, /register and /forgot-password (auth-service 1.1.0);
 * the shell's interceptor adds the correlation id and normalises errors.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly users: SyntheticUser[] = [...SYNTHETIC_USERS];

  login(request: LoginRequest): Observable<AuthResponse> {
    const user = this.users.find(u => u.email === request.email && u.password === request.password);
    return user
      ? of(toAuthResponse(user))
      : throwError(() => apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    if (this.users.some(u => u.email === request.email)) {
      return throwError(() => apiError(409, 'EMAIL_ALREADY_REGISTERED', 'This email is already registered.'));
    }
    const user: SyntheticUser = {
      id: crypto.randomUUID(),
      email: request.email,
      password: request.password,
      name: request.name,
      roles: ['CLIENT'],
    };
    this.users.push(user);
    return of(toAuthResponse(user));
  }

  /** Always succeeds: the contract answers 202 whether or not the account exists. */
  requestPasswordReset(_request: ForgotPasswordRequest): Observable<void> {
    return of(undefined);
  }
}

function toAuthResponse(user: SyntheticUser): AuthResponse {
  return {
    accessToken: `synthetic-access-${user.id}`,
    refreshToken: `synthetic-refresh-${user.id}`,
    expiresIn: EXPIRES_IN_SECONDS,
    user: { id: user.id, email: user.email, name: user.name, roles: [...user.roles] },
  };
}

function apiError(status: number, code: string, userMessage: string): ApiError {
  return { status, code, message: userMessage, details: [], traceId: 'synthetic', userMessage };
}
