import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthSessionService } from './auth/data/session-store';
import { Role } from './auth/model/user';
import { STANDALONE_ROUTES } from './standalone.routes';

describe('standalone routes', () => {
  let router: Router;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(STANDALONE_ROUTES), provideHttpClient(), provideHttpClientTesting()] });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => session.end());

  function signIn(roles: Role[]): void {
    session.start({ accessToken: 't', refreshToken: 'r', expiresIn: 3600, user: { id: '1', email: 'x@cinesync.com', roles } });
  }

  it('opens the billboard placeholder from the root, since the login screen needs the shell client', async () => {
    await RouterTestingHarness.create('/');
    expect(router.url).toBe('/movies');
  });

  it('keeps the login page under /auth like inside the shell', async () => {
    await RouterTestingHarness.create('/auth/login');
    expect(router.url).toBe('/auth/login');
  });

  it('resolves the billboard route that login navigates to', async () => {
    const harness = await RouterTestingHarness.create('/movies');
    expect(router.url).toBe('/movies');
    expect(harness.routeNativeElement!.textContent).toContain('catálogo');
  });

  it('opens /admin for the ADMIN session', async () => {
    signIn(['CLIENT', 'ADMIN']);
    await RouterTestingHarness.create('/admin');
    expect(router.url).toBe('/admin');
  });

  it('opens the user roles page at /admin/users for the ADMIN session', async () => {
    signIn(['CLIENT', 'ADMIN']);
    const harness = await RouterTestingHarness.create('/admin/users');
    expect(router.url).toBe('/admin/users');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain('Roles de usuarios');
  });

  it('sends a CLIENT-only session from /admin to the billboard', async () => {
    signIn(['CLIENT']);
    await RouterTestingHarness.create('/admin');
    expect(router.url).toBe('/movies');
  });
});
