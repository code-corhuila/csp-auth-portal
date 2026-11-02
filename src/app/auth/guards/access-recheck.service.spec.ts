import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../shell-contract';
import { AuthSessionService } from '../data/session-store';
import { Role } from '../model/user';
import { AccessRecheck } from './access-recheck.service';

const refusal = (status: number): ApiError =>
  ({ status, code: 'X', message: 'x', details: [], traceId: 't', userMessage: 'x' });

describe('AccessRecheck', () => {
  let recheck: AccessRecheck;
  let refresh: jasmine.Spy;
  let router: Router;
  let signedIn: boolean;
  let roles: Role[];

  beforeEach(() => {
    signedIn = true;
    roles = ['CLIENT', 'ADMIN'];
    refresh = jasmine.createSpy('refresh').and.resolveTo();
    const session = { refresh, isAuthenticated: () => signedIn, hasRole: (role: Role) => roles.includes(role) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthSessionService, useValue: session }] });
    recheck = TestBed.inject(AccessRecheck);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOnProperty(router, 'url').and.returnValue('/admin/users');
  });

  it('ignores a failure that is not a refusal', async () => {
    for (const status of [0, 400, 404, 409, 429, 500]) {
      await recheck.afterRefusal(refusal(status), 'ADMIN');
    }
    expect(refresh).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('keeps the screen when the renewed session still holds the required role', async () => {
    await recheck.afterRefusal(refusal(403), 'ADMIN');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('sends the person to the billboard when the renewed session lost the required role', async () => {
    roles = ['CLIENT'];
    await recheck.afterRefusal(refusal(403), 'ADMIN');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/movies');
  });

  it('sends the person to login, back to this screen, when the session ended', async () => {
    signedIn = false;
    await recheck.afterRefusal(refusal(401), 'ADMIN');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/auth/login'], { queryParams: { returnUrl: '/admin/users' } });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('asks for no role when the screen needs only a session', async () => {
    roles = [];
    await recheck.afterRefusal(refusal(401));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
