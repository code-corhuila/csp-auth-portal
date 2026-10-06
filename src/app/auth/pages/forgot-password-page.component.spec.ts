import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';

describe('ForgotPasswordPageComponent', () => {
  function create() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
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
});
