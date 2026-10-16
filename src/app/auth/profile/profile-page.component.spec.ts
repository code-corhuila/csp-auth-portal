import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { AuthSessionService } from '../data/session-store';
import { ToastService } from '../ui/toast.service';
import { ProfilePageComponent } from './profile-page.component';

const failure = (status: number, code = 'X'): ApiError =>
  ({ status, code, message: 'English', details: [], traceId: 't', userMessage: 'English' });

describe('ProfilePageComponent', () => {
  const api = { requestEmailChange: jasmine.createSpy('requestEmailChange'), verifyEmailChange: jasmine.createSpy('verifyEmailChange') };
  let toasts: jasmine.Spy;
  let session: AuthSessionService;

  beforeEach(() => {
    api.requestEmailChange.calls.reset();
    api.verifyEmailChange.calls.reset();
    api.requestEmailChange.and.returnValue(of(undefined));
    api.verifyEmailChange.and.returnValue(of(undefined));
    TestBed.configureTestingModule({ providers: [{ provide: AuthApiService, useValue: api }] });
    toasts = spyOn(TestBed.inject(ToastService), 'show');
    session = TestBed.inject(AuthSessionService);
    session.start({ accessToken: 't', refreshToken: 'r', expiresIn: 3600, user: { id: '1', email: 'old@cinesync.com', roles: ['CLIENT'] } });
  });

  afterEach(() => session.end());

  function create() {
    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const type = (selector: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const requestCode = (email = 'New@Cinesync.com ') => {
      type('#profile-email', email);
      submit();
    };
    return { fixture, root, type, submit, requestCode };
  }

  it('shows the current email and a labelled field for the new one', () => {
    const { root } = create();
    expect(root.querySelector('h1')!.textContent).toContain('Mi perfil');
    expect(root.textContent).toContain('old@cinesync.com');
    expect(root.querySelector('label[for="profile-email"]')).not.toBeNull();
    expect(root.querySelector('#profile-code')).toBeNull();
  });

  it('does not call the API while the email is invalid', () => {
    const { root, type, submit } = create();
    type('#profile-email', 'not-an-email');
    submit();
    expect(api.requestEmailChange).not.toHaveBeenCalled();
    expect(root.querySelector('.field-error')!.textContent).toContain('correo válido');
  });

  it('requests the change with the trimmed lower-case email and moves focus to the code field', async () => {
    const { fixture, root, requestCode } = create();
    requestCode();
    expect(api.requestEmailChange).toHaveBeenCalledOnceWith({ email: 'new@cinesync.com' });
    const code = root.querySelector<HTMLInputElement>('#profile-code')!;
    expect(code.getAttribute('inputmode')).toBe('numeric');
    expect(root.querySelector('[role="status"]')!.textContent).toContain('new@cinesync.com');
    await fixture.whenStable();
    expect(document.activeElement).toBe(code);
  });

  it('does not verify a code that is not exactly six digits', () => {
    const { root, requestCode, type, submit } = create();
    requestCode();
    for (const bad of ['12345', '1234567', '12a456', '']) {
      type('#profile-code', bad);
      submit();
    }
    expect(api.verifyEmailChange).not.toHaveBeenCalled();
    expect(root.querySelector('.field-error')!.textContent).toContain('6 dígitos');
  });

  it('verifies the code as a string, keeping leading zeros, then shows the confirmed email', () => {
    const { fixture, root, requestCode, type, submit } = create();
    requestCode();
    type('#profile-code', '004217');
    submit();
    expect(api.verifyEmailChange).toHaveBeenCalledOnceWith({ verificationCode: '004217' });
    expect(toasts).toHaveBeenCalledWith('Tu correo se actualizó a new@cinesync.com.', 'success');
    expect(session.user()!.email).toBe('new@cinesync.com');
    fixture.detectChanges();
    expect(root.textContent).toContain('new@cinesync.com');
    expect(root.querySelector('#profile-code')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('#profile-email')!.value).toBe('');
  });

  it('keeps the code step after a rejected code and offers a new one', () => {
    const { fixture, root, requestCode, type, submit } = create();
    requestCode();
    api.verifyEmailChange.and.returnValue(throwError(() => failure(400)));
    type('#profile-code', '111111');
    submit();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('no es válido o ya venció');
    expect(session.user()!.email).toBe('old@cinesync.com');
    const again = Array.from(root.querySelectorAll('button')).find(b => b.textContent!.includes('Solicitar un código nuevo'))!;
    again.click();
    fixture.detectChanges();
    expect(root.querySelector('#profile-code')).toBeNull();
    expect(root.querySelector('#profile-email')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('goes back to the email step when the address was taken meanwhile', () => {
    const { root, requestCode, type, submit } = create();
    requestCode();
    api.verifyEmailChange.and.returnValue(throwError(() => failure(409, 'EMAIL_ALREADY_REGISTERED')));
    type('#profile-code', '111111');
    submit();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('Ese correo ya está en uso.');
    expect(root.querySelector('#profile-email')).not.toBeNull();
  });

  it('shows the Spanish message of each failure of the request and stays on the email step', () => {
    const cases: [ApiError, string][] = [
      [failure(400), 'correo electrónico válido'],
      [failure(409, 'EMAIL_ALREADY_REGISTERED'), 'Ese correo ya está en uso.'],
      [failure(429, 'RATE_LIMITED'), 'Demasiados intentos'],
      [failure(401), 'Tu sesión expiró'],
      [failure(500), 'no está disponible'],
    ];
    for (const [error, text] of cases) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: AuthApiService, useValue: api }] });
      spyOn(TestBed.inject(ToastService), 'show');
      TestBed.inject(AuthSessionService).start({ accessToken: 't', refreshToken: 'r', expiresIn: 3600, user: { id: '1', email: 'old@cinesync.com', roles: ['CLIENT'] } });
      const { root, requestCode } = create();
      api.requestEmailChange.and.returnValue(throwError(() => error));
      requestCode();
      expect(root.querySelector('[role="alert"]')!.textContent).toContain(text);
      expect(root.querySelector('#profile-code')).toBeNull();
    }
  });

  it('ignores a second submit while a request is in flight', () => {
    const { requestCode, submit } = create();
    api.requestEmailChange.and.returnValue(new Observable<void>());
    requestCode();
    submit();
    expect(api.requestEmailChange).toHaveBeenCalledTimes(1);
  });
});
