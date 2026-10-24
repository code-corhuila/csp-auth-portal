import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthResponse } from '../model/auth';
import { ToastService } from '../ui/toast.service';
import { AuthSessionService } from './session-store';

const KEY = 'csp.auth.refresh';

const response: AuthResponse = {
  accessToken: 'token',
  refreshToken: 'refresh',
  expiresIn: 3600,
  user: { id: '1', email: 'admin@cinesync.com', roles: ['CLIENT', 'ADMIN'] },
};

const rotated: AuthResponse = { ...response, accessToken: 'token-2', refreshToken: 'refresh-2' };

/** Stands in for the shell interceptor: the portal receives the normalised error, never the HttpErrorResponse. */
const shellLikeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((err: HttpErrorResponse) => throwError(() => err.error)));

function shellError(status: number): ApiError {
  return { status, code: 'X', message: 'm', details: [], traceId: 't', userMessage: 'u' };
}

function fail(request: TestRequest, status: number): void {
  request.flush(shellError(status), { status, statusText: 'x' });
}

describe('AuthSessionService', () => {
  let session: AuthSessionService;
  let http: HttpTestingController;
  let toasts: jasmine.Spy;
  let bearerAtSend: Array<string | null>;

  beforeEach(() => {
    jasmine.clock().install();
    sessionStorage.removeItem(KEY);
    bearerAtSend = [];
    const bearerRecorder: HttpInterceptorFn = (req, next) => {
      bearerAtSend.push(TestBed.inject(AuthSessionService).accessToken());
      return next(req);
    };
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([bearerRecorder, shellLikeInterceptor])), provideHttpClientTesting()] });
    session = TestBed.inject(AuthSessionService);
    http = TestBed.inject(HttpTestingController);
    toasts = spyOn(TestBed.inject(ToastService), 'show');
  });

  afterEach(() => {
    session.end();
    http.verify();
    jasmine.clock().uninstall();
  });

  it('starts without a session', () => {
    expect(session.isAuthenticated()).toBeFalse();
    expect(session.user()).toBeNull();
  });

  it('starts a session from an auth response', () => {
    session.start(response);
    expect(session.isAuthenticated()).toBeTrue();
    expect(session.user()?.email).toBe('admin@cinesync.com');
  });

  it('answers role questions from the seeded roles', () => {
    session.start(response);
    expect(session.hasRole('ADMIN')).toBeTrue();
    session.end();
    expect(session.hasRole('ADMIN')).toBeFalse();
  });

  it('ends the session', () => {
    session.start(response);
    session.end();
    expect(session.isAuthenticated()).toBeFalse();
  });

  it('keeps the access token of the session for the shell and forgets it when the session ends', () => {
    expect(session.accessToken()).toBeNull();
    session.start(response);
    expect(session.accessToken()).toBe('token');
    session.end();
    expect(session.accessToken()).toBeNull();
  });

  it('keeps the refresh token in sessionStorage and removes it when the session ends', () => {
    session.start(response);
    expect(sessionStorage.getItem(KEY)).toBe('refresh');
    session.end();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  describe('restore', () => {
    it('resolves without a request when there is no kept token', async () => {
      await session.restore();
      http.expectNone('/api/v1/auth/refresh');
      expect(session.isAuthenticated()).toBeFalse();
    });

    it('restores the session with the kept token and stores the rotated one', async () => {
      sessionStorage.setItem(KEY, 'kept');
      const done = session.restore();
      const request = http.expectOne('/api/v1/auth/refresh');
      expect(request.request.body).toEqual({ refreshToken: 'kept' });
      request.flush(rotated);
      await done;
      expect(session.accessToken()).toBe('token-2');
      expect(session.user()?.email).toBe('admin@cinesync.com');
      expect(sessionStorage.getItem(KEY)).toBe('refresh-2');
    });

    it('ends the session silently and removes the token when the API rejects it (401), and does not reject', async () => {
      sessionStorage.setItem(KEY, 'kept');
      const done = session.restore();
      fail(http.expectOne('/api/v1/auth/refresh'), 401);
      await done;
      expect(session.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(KEY)).toBeNull();
      expect(toasts).not.toHaveBeenCalled();
    });

    it('ends the session and removes the token when the account is locked (423)', async () => {
      sessionStorage.setItem(KEY, 'kept');
      const done = session.restore();
      fail(http.expectOne('/api/v1/auth/refresh'), 423);
      await done;
      expect(sessionStorage.getItem(KEY)).toBeNull();
      expect(toasts).not.toHaveBeenCalled();
    });

    for (const status of [0, 500, 503]) {
      it(`keeps the token silently on a transient failure at load (${status})`, async () => {
        sessionStorage.setItem(KEY, 'kept');
        const done = session.restore();
        fail(http.expectOne('/api/v1/auth/refresh'), status || 504);
        await done;
        expect(session.isAuthenticated()).toBeFalse();
        expect(sessionStorage.getItem(KEY)).toBe('kept');
        expect(toasts).not.toHaveBeenCalled();
      });
    }

    it('does not resurrect a session that ended while the request was in flight', async () => {
      sessionStorage.setItem(KEY, 'kept');
      const done = session.restore();
      const request = http.expectOne('/api/v1/auth/refresh');
      session.end();
      request.flush(rotated);
      await done;
      expect(session.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it('ignores a failure that arrives after the session ended', async () => {
      sessionStorage.setItem(KEY, 'kept');
      const done = session.restore();
      const request = http.expectOne('/api/v1/auth/refresh');
      session.end();
      fail(request, 500);
      await done;
      expect(toasts).not.toHaveBeenCalled();
    });
  });

  describe('renewal', () => {
    it('shares one request between concurrent callers', async () => {
      session.start(response);
      const first = session.refresh();
      const second = session.refresh();
      expect(second).toBe(first);
      http.expectOne('/api/v1/auth/refresh').flush(rotated);
      await first;
      expect(session.accessToken()).toBe('token-2');
    });

    it('tells the person in a session that it expired when the renewal is rejected', async () => {
      session.start(response);
      const done = session.refresh();
      fail(http.expectOne('/api/v1/auth/refresh'), 401);
      await done;
      expect(session.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(KEY)).toBeNull();
      expect(toasts).toHaveBeenCalledWith('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
    });

    it('keeps the token and warns in Spanish when the renewal fails by a transient error', async () => {
      session.start(response);
      const done = session.refresh();
      fail(http.expectOne('/api/v1/auth/refresh'), 503);
      await done;
      expect(session.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(KEY)).toBe('refresh');
      expect(toasts).toHaveBeenCalledWith(jasmine.stringMatching(/problema de conexión/), 'error');
    });

    it('renews the access token a minute before it expires, from the expiry the API returned', async () => {
      session.start({ ...response, expiresIn: 600 });
      jasmine.clock().tick(539_000);
      http.expectNone('/api/v1/auth/refresh');
      jasmine.clock().tick(1_000);
      const done = session.refresh();
      const request = http.expectOne('/api/v1/auth/refresh');
      expect(request.request.body).toEqual({ refreshToken: 'refresh' });
      request.flush(rotated);
      await done;
      expect(session.accessToken()).toBe('token-2');
    });

    it('schedules the next renewal from the new expiry after each rotation', async () => {
      session.start({ ...response, expiresIn: 600 });
      jasmine.clock().tick(540_000);
      const done = session.refresh();
      http.expectOne('/api/v1/auth/refresh').flush({ ...rotated, expiresIn: 120 });
      await done;
      jasmine.clock().tick(59_000);
      http.expectNone('/api/v1/auth/refresh');
      jasmine.clock().tick(1_000);
      expect(http.match('/api/v1/auth/refresh').length).toBe(1);
    });

    it('waits at least a few seconds when the token is about to expire', () => {
      session.start({ ...response, expiresIn: 10 });
      jasmine.clock().tick(4_999);
      http.expectNone('/api/v1/auth/refresh');
      jasmine.clock().tick(1);
      expect(http.match('/api/v1/auth/refresh').length).toBe(1);
    });

    it('cancels the pending renewal when the session ends', () => {
      session.start(response);
      session.end();
      jasmine.clock().tick(3_600_000);
      http.expectNone('/api/v1/auth/refresh');
      expect(session.isAuthenticated()).toBeFalse();
    });

    it('replaces the pending renewal when a new session starts', () => {
      session.start({ ...response, expiresIn: 100 });
      session.start({ ...response, expiresIn: 3600 });
      jasmine.clock().tick(100_000);
      http.expectNone('/api/v1/auth/refresh');
      expect(session.accessToken()).toBe('token');
    });

    it('does nothing without a kept token', async () => {
      await session.refresh();
      http.expectNone('/api/v1/auth/refresh');
    });
  });

  describe('updateEmail', () => {
    it('replaces the email of the signed-in user and keeps the rest', () => {
      session.start(response);
      session.updateEmail('new@cinesync.com');
      expect(session.user()).toEqual({ ...response.user, email: 'new@cinesync.com' });
      expect(session.accessToken()).toBe('token');
    });

    it('does nothing without a session', () => {
      session.updateEmail('new@cinesync.com');
      expect(session.user()).toBeNull();
    });
  });

  describe('signOut', () => {
    it('revokes the refresh token and clears the session', async () => {
      session.start(response);
      const done = session.signOut();
      const request = http.expectOne('/api/v1/auth/logout');
      expect(request.request.body).toEqual({ refreshToken: 'refresh' });
      request.flush(null, { status: 204, statusText: 'No Content' });
      await done;
      expect(session.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it('clears the session even if the revocation fails', async () => {
      session.start(response);
      const done = session.signOut();
      fail(http.expectOne('/api/v1/auth/logout'), 500);
      await done;
      expect(session.accessToken()).toBeNull();
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it('forgets the session before the revocation answers, so leaving the page cannot restore it', async () => {
      session.start(response);
      const done = session.signOut();
      expect(session.isAuthenticated()).toBeFalse();
      expect(session.accessToken()).toBeNull();
      expect(sessionStorage.getItem(KEY)).toBeNull();
      http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      await done;
    });

    it('sends the revocation with the access token that was current and asks the browser to keep it alive across navigation', async () => {
      session.start(response);
      const done = session.signOut();
      expect(bearerAtSend).toEqual(['token']);
      const request = http.expectOne('/api/v1/auth/logout');
      expect(request.request.keepalive).toBeTrue();
      request.flush(null, { status: 204, statusText: 'No Content' });
      await done;
    });

    it('makes no request without a kept token', async () => {
      await session.signOut();
      http.expectNone('/api/v1/auth/logout');
      expect(session.isAuthenticated()).toBeFalse();
    });
  });
});
