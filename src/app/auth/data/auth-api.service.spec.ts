import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthResponse, RegisterRequest } from '../model/auth';
import { AuthApiService } from './auth-api.service';

const response: AuthResponse = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 3600,
  user: { id: '1', email: 'maria@cinesync.com', roles: ['CLIENT'] },
};

const registration: RegisterRequest = {
  email: 'new@cinesync.com',
  password: 'SecurePass123!',
  name: 'New User',
  phone: '3001234567',
  address: 'Calle 1',
};

/** Stands in for the shell interceptor: the portal receives the normalised error, never the HttpErrorResponse. */
const shellLikeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((err: HttpErrorResponse) => throwError(() => err.error)));

function shellError(status: number, code: string, message = 'server message'): ApiError {
  return { status, code, message, details: [], traceId: 't', userMessage: 'shell message' };
}

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([shellLikeInterceptor])), provideHttpClientTesting()] });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the credentials to /login and returns the session payload', () => {
    let received: AuthResponse | undefined;
    service.login({ email: 'maria@cinesync.com', password: 'SecurePass123!' }).subscribe(r => (received = r));
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'maria@cinesync.com', password: 'SecurePass123!' });
    request.flush(response);
    expect(received).toEqual(response);
  });

  it('replaces the message of a 401 of /login', () => {
    let caught: ApiError | undefined;
    service.login({ email: 'x@cinesync.com', password: 'wrong' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/login').flush(shellError(401, 'UNAUTHORIZED'), { status: 401, statusText: 'x' });
    expect(caught?.status).toBe(401);
    expect(caught?.userMessage).toBe('Correo o contraseña incorrectos.');
  });

  it('explains a locked account on a 423 of /login', () => {
    let caught: ApiError | undefined;
    service.login({ email: 'x@cinesync.com', password: 'p' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/login').flush(shellError(423, 'ACCOUNT_LOCKED'), { status: 423, statusText: 'x' });
    expect(caught?.userMessage).toContain('bloqueada');
  });

  it('keeps the message of the shell for any other login failure', () => {
    let caught: ApiError | undefined;
    service.login({ email: 'x@cinesync.com', password: 'p' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/login').flush(shellError(429, 'TOO_MANY_REQUESTS'), { status: 429, statusText: 'x' });
    expect(caught?.userMessage).toBe('shell message');
  });

  it('posts the refresh token to /refresh and returns the rotated tokens', () => {
    let received: AuthResponse | undefined;
    service.refresh({ refreshToken: 'refresh' }).subscribe(r => (received = r));
    const request = http.expectOne('/api/v1/auth/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh' });
    request.flush(response);
    expect(received).toEqual(response);
  });

  it('posts the refresh token to /logout to revoke it', () => {
    let completed = false;
    service.logout({ refreshToken: 'refresh' }).subscribe({ complete: () => (completed = true) });
    const request = http.expectOne('/api/v1/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBeTrue();
  });

  it('posts the registration with a fresh Idempotency-Key per call', () => {
    service.register(registration).subscribe();
    service.register(registration).subscribe();
    const [first, second] = http.match('/api/v1/auth/register');
    expect(first.request.body).toEqual(registration);
    expect(first.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(first.request.headers.get('Idempotency-Key')).not.toBe(second.request.headers.get('Idempotency-Key'));
    first.flush(response);
    second.flush(response);
  });

  it('says the email is already registered on EMAIL_ALREADY_REGISTERED', () => {
    let caught: ApiError | undefined;
    service.register(registration).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/register').flush(shellError(409, 'EMAIL_ALREADY_REGISTERED'), { status: 409, statusText: 'x' });
    expect(caught?.userMessage).toBe('Este correo ya está registrado.');
  });

  it('keeps the message of the shell for any other registration failure', () => {
    let caught: ApiError | undefined;
    service.register(registration).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/register').flush(shellError(400, 'VALIDATION_ERROR'), { status: 400, statusText: 'x' });
    expect(caught?.userMessage).toBe('shell message');
  });

  it('wraps an error that did not come through the shell interceptor', () => {
    let caught: ApiError | undefined;
    service.login({ email: 'x@cinesync.com', password: 'p' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/login').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(caught?.code).toBe('UNKNOWN');
  });

  it('posts the email to /forgot-password and completes on 202', () => {
    let completed = false;
    service.requestPasswordReset({ email: 'nobody@cinesync.com' }).subscribe({ complete: () => (completed = true) });
    const request = http.expectOne('/api/v1/auth/forgot-password');
    expect(request.request.body).toEqual({ email: 'nobody@cinesync.com' });
    request.flush(null, { status: 202, statusText: 'Accepted' });
    expect(completed).toBeTrue();
  });

  it('patches the new email to /me/email and completes on 202', () => {
    let completed = false;
    service.requestEmailChange({ email: 'new@cinesync.com' }).subscribe({ complete: () => (completed = true) });
    const request = http.expectOne('/api/v1/auth/me/email');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ email: 'new@cinesync.com' });
    request.flush(null, { status: 202, statusText: 'Accepted' });
    expect(completed).toBeTrue();
  });

  it('posts the code as a string to /me/email/verify and completes on 204', () => {
    let completed = false;
    service.verifyEmailChange({ verificationCode: '004217' }).subscribe({ complete: () => (completed = true) });
    const request = http.expectOne('/api/v1/auth/me/email/verify');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ verificationCode: '004217' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBeTrue();
  });

  it('passes the shell error of the email change through untouched', () => {
    let caught: ApiError | undefined;
    service.requestEmailChange({ email: 'taken@cinesync.com' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/me/email').flush(shellError(409, 'EMAIL_ALREADY_REGISTERED'), { status: 409, statusText: 'Conflict' });
    expect(caught?.code).toBe('EMAIL_ALREADY_REGISTERED');
  });
});
