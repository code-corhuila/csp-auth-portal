import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { RefreshTokenStore } from '../data/refresh-token-store';
import { AuthSessionService } from '../data/session-store';
import { AuthResponse } from '../model/auth';
import { ToastService } from '../ui/toast.service';
import { PasswordSectionComponent } from './password-section.component';

const freshSession: AuthResponse = {
  accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600,
  user: { id: '1', email: 'maria@cinesync.com', roles: ['CLIENT'] },
};

const rejected = (status: number, field?: string, message = 'English', retryAfterSeconds?: number): ApiError => ({
  status, code: 'X', message: 'English', traceId: 't', userMessage: 'English',
  details: field ? [{ field, message }] : [], ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
});

describe('PasswordSectionComponent', () => {
  const api = { changeMyPassword: jasmine.createSpy('changeMyPassword') };
  let toasts: jasmine.Spy;
  let session: AuthSessionService;

  beforeEach(() => {
    sessionStorage.clear();
    api.changeMyPassword.calls.reset();
    api.changeMyPassword.and.returnValue(of(freshSession));
    TestBed.configureTestingModule({ providers: [{ provide: AuthApiService, useValue: api }] });
    toasts = spyOn(TestBed.inject(ToastService), 'show');
    session = TestBed.inject(AuthSessionService);
    session.start({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresIn: 3600, user: { id: '1', email: 'maria@cinesync.com', roles: ['CLIENT'] } });
  });

  afterEach(() => {
    session.end();
    sessionStorage.clear();
  });

  function create() {
    const fixture = TestBed.createComponent(PasswordSectionComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const input = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
    const type = (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
    };
    const submit = () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const change = (current = 'OldPass123', next = 'NewPass456', confirmation = next) => {
      type('password-current', current);
      type('password-new', next);
      type('password-confirmation', confirmation);
      submit();
    };
    return { fixture, root, input, change };
  }

  it('shows three labelled password fields with the right autocomplete', () => {
    const { root, input } = create();
    expect(root.querySelector('h2')!.textContent).toContain('Contraseña');
    for (const id of ['password-current', 'password-new', 'password-confirmation']) {
      expect(root.querySelector(`label[for="${id}"]`)).not.toBeNull();
      expect(input(id).type).toBe('password');
    }
    expect(input('password-current').autocomplete).toBe('current-password');
    expect(input('password-new').autocomplete).toBe('new-password');
  });

  it('does not call the API with a weak new password, a mismatch or an empty current password', () => {
    const { root, change } = create();
    change('OldPass123', 'weak');
    expect(root.querySelector('#password-new-error')!.textContent).toContain('8 a 72 caracteres');
    change('OldPass123', 'NewPass456', 'Other456');
    expect(root.querySelector('#password-confirmation-error')!.textContent).toContain('no coinciden');
    change('', 'NewPass456');
    expect(root.querySelector('#password-current-error')).not.toBeNull();
    expect(api.changeMyPassword).not.toHaveBeenCalled();
  });

  it('sends both passwords, never the confirmation', () => {
    const { change } = create();
    change();
    expect(api.changeMyPassword).toHaveBeenCalledOnceWith({ currentPassword: 'OldPass123', newPassword: 'NewPass456' });
  });

  it('stores the fresh session like a login, clears the form and confirms', () => {
    const { fixture, input, change } = create();
    change();
    expect(session.accessToken()).toBe('new-access');
    expect(TestBed.inject(RefreshTokenStore).read()).toBe('new-refresh');
    expect(toasts).toHaveBeenCalledWith('Tu contraseña se actualizó. Cerramos tus otras sesiones.', 'success');
    fixture.detectChanges();
    for (const id of ['password-current', 'password-new', 'password-confirmation']) {
      expect(input(id).value).toBe('');
    }
  });

  it('marks the current password field on a wrong one and keeps the session', () => {
    const { fixture, root, input, change } = create();
    api.changeMyPassword.and.returnValue(throwError(() => rejected(400, 'currentPassword', 'The current password is incorrect')));
    change();
    fixture.detectChanges();
    expect(root.querySelector('#password-current-error')!.textContent).toContain('La contraseña actual no es correcta.');
    expect(input('password-current').getAttribute('aria-describedby')).toContain('password-current-error');
    expect(session.accessToken()).toBe('old-access');
    expect(toasts).not.toHaveBeenCalled();
  });

  it('marks the new password field when it equals the current one', () => {
    const { root, change } = create();
    api.changeMyPassword.and.returnValue(throwError(() => rejected(400, 'newPassword', 'The new password must differ from the current one')));
    change();
    expect(root.querySelector('#password-new-error')!.textContent).toContain('debe ser distinta de la actual');
  });

  it('shows the wait of a 429 and a generic text for other failures', () => {
    const { root, change } = create();
    api.changeMyPassword.and.returnValue(throwError(() => rejected(429, undefined, '', 900)));
    change();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('en 15 minutos');
    api.changeMyPassword.and.returnValue(throwError(() => rejected(500)));
    change();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('no está disponible');
  });

  it('ignores a second submit while the request is in flight', () => {
    const { change } = create();
    api.changeMyPassword.and.returnValue(new Observable<AuthResponse>());
    change();
    change();
    expect(api.changeMyPassword).toHaveBeenCalledTimes(1);
  });
});
