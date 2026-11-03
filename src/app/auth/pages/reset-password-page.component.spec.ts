import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { ResetPasswordPageComponent } from './reset-password-page.component';

const TOKEN = '0b8f3c1e-5a7d-4e2b-9c64-1d2e3f4a5b6c';
const STRONG = 'Cinesync2026';

function apiError(status: number, code = 'X'): ApiError {
  return { status, code, message: 'server text', details: [], traceId: 't', userMessage: 'shell text' };
}

describe('ResetPasswordPageComponent', () => {
  const api = { resetPassword: jasmine.createSpy('resetPassword') };
  let router: Router;

  function create(fragment: string | null = `token=${TOKEN}`) {
    api.resetPassword.calls.reset();
    api.resetPassword.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ResetPasswordPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function fill(root: HTMLElement, password: string, confirmation: string): void {
    for (const [id, value] of [['#reset-password', password], ['#reset-confirmation', confirmation]]) {
      const input = root.querySelector<HTMLInputElement>(id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  }

  function submit(fixture: ReturnType<typeof create>): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('renders its heading and two labelled password fields', () => {
    const root: HTMLElement = create().nativeElement;
    expect(root.querySelector('h1')!.textContent).toContain('Nueva contraseña');
    expect(root.querySelector('label[for="reset-password"]')).not.toBeNull();
    expect(root.querySelector('label[for="reset-confirmation"]')).not.toBeNull();
  });

  it('removes the fragment from the address and the history once it is read', () => {
    create();
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ replaceUrl: true }));
    const extras = (router.navigate as jasmine.Spy).calls.mostRecent().args[1];
    expect(extras.fragment).toBeUndefined();
  });

  it('sends the token of the fragment with the new password', () => {
    const fixture = create();
    fill(fixture.nativeElement, STRONG, STRONG);
    submit(fixture);
    expect(api.resetPassword).toHaveBeenCalledOnceWith({ token: TOKEN, password: STRONG });
  });

  it('confirms the change and offers the login on 204', () => {
    const fixture = create();
    fill(fixture.nativeElement, STRONG, STRONG);
    submit(fixture);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Tu contraseña se actualizó');
    expect(root.querySelector('a[href="/auth/login"]')).not.toBeNull();
    expect(root.querySelector('form')).toBeNull();
  });

  it('does not send a weak password', () => {
    const fixture = create();
    fill(fixture.nativeElement, 'weak', 'weak');
    submit(fixture);
    expect(api.resetPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#reset-password-error')).not.toBeNull();
  });

  it('does not send when the confirmation differs', () => {
    const fixture = create();
    fill(fixture.nativeElement, STRONG, `${STRONG}x`);
    submit(fixture);
    expect(api.resetPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#reset-confirmation-error')!.textContent).toContain('no coinciden');
  });

  it('offers a new link when the token is rejected (401), without the form', () => {
    const fixture = create();
    api.resetPassword.and.returnValue(throwError(() => apiError(401, 'INVALID_TOKEN')));
    fill(fixture.nativeElement, STRONG, STRONG);
    submit(fixture);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('no es válido o ya venció');
    expect(root.querySelector('a[href="/auth/forgot-password"]')).not.toBeNull();
    expect(root.querySelector('form')).toBeNull();
  });

  it('keeps the form and asks to retry when the service is busy (429)', () => {
    const fixture = create();
    api.resetPassword.and.returnValue(throwError(() => apiError(429, 'RATE_LIMITED')));
    fill(fixture.nativeElement, STRONG, STRONG);
    submit(fixture);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('ocupado');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeFalse();
  });

  it('keeps the form editable and resends the same token when the new password equals the current one', () => {
    const fixture = create();
    const same: ApiError = { ...apiError(400, 'VALIDATION_ERROR'), details: [{ field: 'password', message: 'The new password must differ from the current one' }] };
    api.resetPassword.and.returnValue(throwError(() => same));
    fill(fixture.nativeElement, STRONG, STRONG);
    submit(fixture);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('debe ser distinta de la actual');
    expect(root.querySelector('form')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeFalse();

    api.resetPassword.and.returnValue(of(undefined));
    fill(root, 'Cinesync2027', 'Cinesync2027');
    submit(fixture);
    expect(api.resetPassword.calls.count()).toBe(2);
    expect(api.resetPassword.calls.mostRecent().args[0]).toEqual({ token: TOKEN, password: 'Cinesync2027' });
    expect(root.querySelector('form')).toBeNull();
  });

  for (const status of [400, 404, 500]) {
    it(`shows a Spanish message on ${status} and never the server text`, () => {
      const fixture = create();
      api.resetPassword.and.returnValue(throwError(() => apiError(status)));
      fill(fixture.nativeElement, STRONG, STRONG);
      submit(fixture);
      const text = fixture.nativeElement.querySelector('[role="alert"]')!.textContent;
      expect(text).not.toContain('server text');
      expect(text).not.toContain('shell text');
    });
  }

  for (const [name, fragment] of [['missing', null], ['malformed', 'token=abc'], ['under another key', `code=${TOKEN}`]] as const) {
    it(`offers a new link and sends nothing when the token is ${name}`, () => {
      const fixture = create(fragment);
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('form')).toBeNull();
      expect(root.querySelector('a[href="/auth/forgot-password"]')).not.toBeNull();
      expect(api.resetPassword).not.toHaveBeenCalled();
    });
  }

  it('does not log or render the token', () => {
    const log = spyOn(console, 'log');
    const root: HTMLElement = create().nativeElement;
    expect(root.innerHTML).not.toContain(TOKEN);
    expect(log).not.toHaveBeenCalled();
  });
});
