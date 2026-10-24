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

function shellError(status: number, code: string, message = 'server message', retryAfterSeconds?: number): ApiError {
  return { status, code, message, details: [], traceId: 't', userMessage: 'shell message', ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }) };
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

  for (const code of ['RATE_LIMITED', 'TOO_MANY_REQUESTS']) {
    it(`explains the failed-attempts limit on a 429 ${code} of /login`, () => {
      let caught: ApiError | undefined;
      service.login({ email: 'x@cinesync.com', password: 'p' }).subscribe({ error: e => (caught = e) });
      http.expectOne('/api/v1/auth/login').flush(shellError(429, code), { status: 429, statusText: 'x' });
      expect(caught?.status).toBe(429);
      expect(caught?.userMessage).toBe('Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.');
    });
  }

  const waits: [number, string][] = [
    [1, '1 minuto'],
    [59, '1 minuto'],
    [60, '1 minuto'],
    [61, '2 minutos'],
    [300, '5 minutos'],
  ];
  for (const [seconds, wait] of waits) {
    it(`tells to wait ${wait} when a 429 of /login says ${seconds} seconds`, () => {
      let caught: ApiError | undefined;
      service.login({ email: 'x@cinesync.com', password: 'p' }).subscribe({ error: e => (caught = e) });
      http.expectOne('/api/v1/auth/login').flush(shellError(429, 'RATE_LIMITED', 'server message', seconds), { status: 429, statusText: 'x' });
      expect(caught?.userMessage).toBe(`Demasiados intentos fallidos. Inténtalo de nuevo en ${wait}.`);
    });
  }

  it('keeps the message of the shell for any other login failure', () => {
    let caught: ApiError | undefined;
    service.login({ email: 'x@cinesync.com', password: 'p' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/login').flush(shellError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'x' });
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
    expect(request.request.keepalive).toBeTrue();
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

  it('sends a fresh Idempotency-Key of 8 to 128 characters on both email change calls, as the contract requires', () => {
    service.requestEmailChange({ email: 'new@cinesync.com' }).subscribe();
    service.requestEmailChange({ email: 'new@cinesync.com' }).subscribe();
    service.verifyEmailChange({ verificationCode: '004217' }).subscribe();
    const [firstRequest, secondRequest] = http.match('/api/v1/auth/me/email');
    const verification = http.expectOne('/api/v1/auth/me/email/verify');
    const keys = [firstRequest, secondRequest, verification].map(call => call.request.headers.get('Idempotency-Key') ?? '');
    for (const key of keys) {
      expect(key.length).toBeGreaterThanOrEqual(8);
      expect(key.length).toBeLessThanOrEqual(128);
    }
    expect(new Set(keys).size).toBe(3);
  });

  it('passes the shell error of the email change through untouched', () => {
    let caught: ApiError | undefined;
    service.requestEmailChange({ email: 'taken@cinesync.com' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/me/email').flush(shellError(409, 'EMAIL_ALREADY_REGISTERED'), { status: 409, statusText: 'Conflict' });
    expect(caught?.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('posts to /forgot-password without an Idempotency-Key, as the contract says', () => {
    service.requestPasswordReset({ email: 'maria@cinesync.com' }).subscribe();
    const request = http.expectOne('/api/v1/auth/forgot-password');
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('posts the token and the new password to /reset-password without an Idempotency-Key and completes on 204', () => {
    let completed = false;
    service.resetPassword({ token: '0b8f3c1e-5a7d-4e2b-9c64-1d2e3f4a5b6c', password: 'SecurePass123!' }).subscribe({ complete: () => (completed = true) });
    const request = http.expectOne('/api/v1/auth/reset-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: '0b8f3c1e-5a7d-4e2b-9c64-1d2e3f4a5b6c', password: 'SecurePass123!' });
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBeTrue();
  });

  it('hands the 401 of /reset-password to the page unchanged', () => {
    let caught: ApiError | undefined;
    service.resetPassword({ token: '0b8f3c1e-5a7d-4e2b-9c64-1d2e3f4a5b6c', password: 'SecurePass123!' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/reset-password').flush(shellError(401, 'INVALID_TOKEN'), { status: 401, statusText: 'x' });
    expect(caught?.status).toBe(401);
    expect(caught?.code).toBe('INVALID_TOKEN');
  });

  it('gets the own profile from /me', () => {
    const profile = { id: '1', email: 'maria@cinesync.com', name: 'Maria', phone: null, address: null, roles: ['CLIENT'] };
    let received: unknown;
    service.getMyProfile().subscribe(p => (received = p));
    const request = http.expectOne('/api/v1/auth/me');
    expect(request.request.method).toBe('GET');
    request.flush(profile);
    expect(received).toEqual(profile);
  });

  it('patches only the given fields to /me without an Idempotency-Key', () => {
    service.updateMyProfile({ phone: '+573001234567' }).subscribe();
    const request = http.expectOne('/api/v1/auth/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ phone: '+573001234567' });
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush({ id: '1', email: 'maria@cinesync.com', name: 'Maria', phone: '+573001234567', address: null, roles: ['CLIENT'] });
  });

  it('posts both passwords to /me/password without an Idempotency-Key and returns the fresh session', () => {
    let received: AuthResponse | undefined;
    service.changeMyPassword({ currentPassword: 'OldPass123', newPassword: 'NewPass456' }).subscribe(r => (received = r));
    const request = http.expectOne('/api/v1/auth/me/password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ currentPassword: 'OldPass123', newPassword: 'NewPass456' });
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush(response);
    expect(received).toEqual(response);
  });

  it('passes the shell error of a wrong current password through untouched', () => {
    let caught: ApiError | undefined;
    service.changeMyPassword({ currentPassword: 'x', newPassword: 'NewPass456' }).subscribe({ error: e => (caught = e) });
    http.expectOne('/api/v1/auth/me/password').flush(
      { ...shellError(400, 'VALIDATION_ERROR'), details: [{ field: 'currentPassword', message: 'The current password is incorrect' }] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught?.details).toEqual([{ field: 'currentPassword', message: 'The current password is incorrect' }]);
  });
});
