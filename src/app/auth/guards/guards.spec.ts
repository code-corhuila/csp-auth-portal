import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthSessionService } from '../data/session-store';
import { Role } from '../model/user';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

function signIn(session: AuthSessionService, roles: Role[]): void {
  session.start({
    accessToken: 't',
    refreshToken: 'r',
    expiresIn: 3600,
    user: { id: '1', email: 'x@cinesync.com', roles },
  });
}

describe('route guards', () => {
  let session: AuthSessionService;
  let router: Router;
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
  });

  const run = (guard: typeof authGuard, url: string) =>
    TestBed.runInInjectionContext(() => guard(route, state(url)));

  it('lets an authenticated session through authGuard', () => {
    signIn(session, ['CLIENT']);
    expect(run(authGuard, '/booking')).toBeTrue();
  });

  it('sends an anonymous visitor to login keeping the requested route', () => {
    const result = run(authGuard, '/booking/seats') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/auth/login?returnUrl=%2Fbooking%2Fseats');
  });

  it('opens /admin for an ADMIN session', () => {
    signIn(session, ['CLIENT', 'ADMIN']);
    expect(run(roleGuard, '/admin')).toBeTrue();
  });

  it('redirects a CLIENT-only session to the billboard', () => {
    signIn(session, ['CLIENT']);
    const result = run(roleGuard, '/admin') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/movies');
  });

  it('sends an anonymous visitor to login before judging the role', () => {
    const result = run(roleGuard, '/admin') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/auth/login?returnUrl=%2Fadmin');
  });
});
