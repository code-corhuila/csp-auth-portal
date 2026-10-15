import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';

describe('ForgotPasswordPageComponent', () => {
  const api = { requestPasswordReset: jasmine.createSpy('requestPasswordReset') };

  function create() {
    api.requestPasswordReset.calls.reset();
    api.requestPasswordReset.and.returnValue(of(undefined));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthApiService, useValue: api }] });
    const fixture = TestBed.createComponent(ForgotPasswordPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders its heading and a labelled email field', () => {
    const root: HTMLElement = create().nativeElement;
    expect(root.querySelector('h1')!.textContent).toContain('Recuperar contraseña');
    expect(root.querySelector('label[for="forgot-email"]')).not.toBeNull();
  });

  it('opens as a modal and closes back to login', () => {
    const fixture = create();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    (fixture.nativeElement.querySelector('.auth-close') as HTMLButtonElement).click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('confirms neutrally whether or not the account exists', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const input = root.querySelector<HTMLInputElement>('#forgot-email')!;
    input.value = 'nobody@cinesync.com';
    input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Si la cuenta existe');
  });

  it('does not send the request while the email is invalid', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('shows the failure and lets the person try again when the request is rejected', () => {
    const fixture = create();
    const rejected: ApiError = { status: 429, code: 'X', message: 'x', details: [], traceId: 't', userMessage: 'Too many requests.' };
    api.requestPasswordReset.and.returnValue(throwError(() => rejected));
    const root: HTMLElement = fixture.nativeElement;
    const input = root.querySelector<HTMLInputElement>('#forgot-email')!;
    input.value = 'maria@cinesync.com';
    input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('Too many requests.');
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeFalse();
  });
});
