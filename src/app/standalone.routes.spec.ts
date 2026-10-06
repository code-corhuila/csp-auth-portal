import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthApiService } from './auth/data/auth-api.service';
import { AuthSessionService } from './auth/data/session-store';
import { SYNTHETIC_USERS } from './auth/data/synthetic-users';
import { STANDALONE_ROUTES } from './standalone.routes';

describe('standalone routes', () => {
  let router: Router;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(STANDALONE_ROUTES)] });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
  });

  function signIn(email: string): void {
    const user = SYNTHETIC_USERS.find(u => u.email === email)!;
    TestBed.inject(AuthApiService).login({ email, password: user.password }).subscribe(r => session.start(r));
  }

  it('opens the login page from the root, under /auth like inside the shell', async () => {
    await RouterTestingHarness.create('/');
    expect(router.url).toBe('/auth/login');
  });

  it('resolves the billboard route that login navigates to', async () => {
    const harness = await RouterTestingHarness.create('/movies');
    expect(router.url).toBe('/movies');
    expect(harness.routeNativeElement!.textContent).toContain('catálogo');
  });

  it('opens /admin for the ADMIN session', async () => {
    signIn('admin@cinesync.com');
    await RouterTestingHarness.create('/admin');
    expect(router.url).toBe('/admin');
  });

  it('sends a CLIENT-only session from /admin to the billboard', async () => {
    signIn('maria@cinesync.com');
    await RouterTestingHarness.create('/admin');
    expect(router.url).toBe('/movies');
  });
});
