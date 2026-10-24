import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AUTH_ROUTES } from './auth.routes';
import { AuthSessionService } from './data/session-store';
import { Role } from './model/user';

describe('AUTH_ROUTES', () => {
  const paths = AUTH_ROUTES.map(route => route.path);

  it('exposes login, register, forgot-password, reset-password and profile', () => {
    expect(paths).toEqual(jasmine.arrayContaining(['login', 'register', 'forgot-password', 'reset-password', 'profile']));
  });

  it('titles the profile route in UTF-8 Spanish', () => {
    expect(AUTH_ROUTES.find(route => route.path === 'profile')?.title).toBe('Mi perfil · Cambiar correo');
  });

  it('redirects the empty path to login', () => {
    const root = AUTH_ROUTES.find(route => route.path === '');
    expect(root?.redirectTo).toBe('login');
    expect(root?.pathMatch).toBe('full');
  });

  it('loads the page component of each route on demand', async () => {
    const loaded = await Promise.all(
      AUTH_ROUTES.filter(route => route.loadComponent).map(route => route.loadComponent!()),
    );
    expect(loaded.length).toBe(5);
    loaded.forEach(component => expect(component).toBeDefined());
  });
});

describe('AUTH_ROUTES profile', () => {
  const session = () => TestBed.inject(AuthSessionService);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'auth', children: AUTH_ROUTES }]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => session().end());

  function signIn(roles: Role[]): void {
    session().start({ accessToken: 't', refreshToken: 'r', expiresIn: 3600, user: { id: '1', email: 'x@cinesync.com', roles } });
  }

  it('shows the current email to a CLIENT-only session', async () => {
    signIn(['CLIENT']);
    const harness = await RouterTestingHarness.create('/auth/profile');
    expect(harness.routeNativeElement!.textContent).toContain('x@cinesync.com');
  });

  it('shows it to an ADMIN session too', async () => {
    signIn(['CLIENT', 'ADMIN']);
    await RouterTestingHarness.create('/auth/profile');
    expect(TestBed.inject(Router).url).toBe('/auth/profile');
  });

  it('sends an anonymous visitor to login keeping the address', async () => {
    await RouterTestingHarness.create('/auth/profile');
    expect(TestBed.inject(Router).url).toBe('/auth/login?returnUrl=%2Fauth%2Fprofile');
  });
});
