import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthSessionService } from '../data/session-store';
import { AuthApiService } from '../data/auth-api.service';
import { ConfirmRegistrationPageComponent } from './confirm-registration-page.component';

const TOKEN = '0b8f3c1e-5a7d-4e2b-9c64-1d2e3f4a5b6c';

function apiError(status: number, code = 'X'): ApiError {
  return { status, code, message: 'server text', details: [], traceId: 't', userMessage: 'shell text' };
}

describe('ConfirmRegistrationPageComponent', () => {
  const api = { confirmRegistration: jasmine.createSpy('confirmRegistration') };
  let router: Router;

  function create(fragment: string | null = `token=${TOKEN}`, answer = of({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600, user: { id: '1', email: 'x@cinesync.com', roles: ['CLIENT'] } })) {
    api.confirmRegistration.calls.reset();
    api.confirmRegistration.and.returnValue(answer);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(ConfirmRegistrationPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('confirms with the token of the fragment and a key of this opening, then points to login without signing in', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const [request, key] = api.confirmRegistration.calls.mostRecent().args;
    expect(request).toEqual({ token: TOKEN });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Tu cuenta quedó confirmada');
    expect(root.querySelector('a[href="/auth/login"]')).not.toBeNull();
    expect(TestBed.inject(AuthSessionService).isAuthenticated()).toBeFalse();
  });

  it('removes the fragment from the address and the history once it is read', () => {
    create();
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ replaceUrl: true }));
    expect((router.navigate as jasmine.Spy).calls.mostRecent().args[1].fragment).toBeUndefined();
  });

  it('never shows the token', () => {
    expect(create().nativeElement.textContent).not.toContain(TOKEN);
  });

  for (const [label, fragment] of [['no fragment', null], ['another parameter', 'other=1'], ['a malformed token', 'token=abc'], ['an uppercase token', `token=${TOKEN.toUpperCase()}`]] as const) {
    it(`rejects the link without calling the API when it has ${label}`, () => {
      const root: HTMLElement = create(fragment).nativeElement;
      expect(api.confirmRegistration).not.toHaveBeenCalled();
      expect(root.querySelector('[role="alert"]')!.textContent).toContain('El enlace no es válido o ya venció');
      expect(root.querySelector('a[href="/auth/register"]')).not.toBeNull();
    });
  }

  it('says the link is invalid for a token the API rejects, whatever the reason', () => {
    const root: HTMLElement = create(`token=${TOKEN}`, throwError(() => apiError(401, 'INVALID_TOKEN'))).nativeElement;
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('El enlace no es válido o ya venció');
  });

  it('points to login when the email got an account meanwhile', () => {
    const root: HTMLElement = create(`token=${TOKEN}`, throwError(() => apiError(409, 'EMAIL_ALREADY_REGISTERED'))).nativeElement;
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Este correo ya tiene una cuenta');
    expect(root.querySelector('a[href="/auth/login"]')).not.toBeNull();
  });

  it('shows a message in Spanish, never the text of the server, for a failure of the service', () => {
    const root: HTMLElement = create(`token=${TOKEN}`, throwError(() => apiError(503, 'SERVICE_UNAVAILABLE'))).nativeElement;
    const text = root.querySelector('[role="alert"]')!.textContent!;
    expect(text).toContain('El servicio no está disponible en este momento');
    expect(text).not.toContain('server text');
    expect(text).not.toContain('shell text');
  });

  it('closes to login', () => {
    const fixture = create();
    (fixture.nativeElement.querySelector('.auth-close') as HTMLButtonElement).click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });
});
