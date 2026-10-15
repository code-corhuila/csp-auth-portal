import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthSessionService } from '../data/session-store';
import { Role } from '../model/user';
import { UsersAdminApiService } from './data/users-admin-api.service';
import { ADMIN_ROUTES } from './admin.routes';

describe('ADMIN_ROUTES', () => {
  let session: AuthSessionService;

  beforeEach(() => {
    const api = { list: () => of({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }) };
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'users', children: ADMIN_ROUTES }, { path: 'movies', children: [] }, { path: 'auth/login', children: [] }]), { provide: UsersAdminApiService, useValue: api }, provideHttpClient(), provideHttpClientTesting()],
    });
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => session.end());

  function signIn(roles: Role[]): void {
    session.start({ accessToken: 't', refreshToken: 'r', expiresIn: 3600, user: { id: '1', email: 'x@cinesync.com', roles } });
  }

  it('renders the users page for an ADMIN at the empty path', async () => {
    signIn(['CLIENT', 'ADMIN']);
    const harness = await RouterTestingHarness.create('/users');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain('Roles de usuarios');
  });

  it('sends a CLIENT-only session to the billboard', async () => {
    signIn(['CLIENT']);
    await RouterTestingHarness.create('/users');
    expect(TestBed.inject(Router).url).toBe('/movies');
  });

  it('sends an anonymous visitor to login keeping the address', async () => {
    await RouterTestingHarness.create('/users');
    expect(TestBed.inject(Router).url).toBe('/auth/login?returnUrl=%2Fusers');
  });

  it('titles the page', () => {
    expect(ADMIN_ROUTES[0].title).toBe('Administración · Roles de usuarios');
  });
});
