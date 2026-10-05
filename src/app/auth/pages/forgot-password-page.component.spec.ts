import { TestBed } from '@angular/core/testing';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';

describe('ForgotPasswordPageComponent', () => {
  function create() {
    const fixture = TestBed.createComponent(ForgotPasswordPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders its heading and a labelled email field', () => {
    const root: HTMLElement = create().nativeElement;
    expect(root.querySelector('h1')!.textContent).toContain('Recover password');
    expect(root.querySelector('label[for="forgot-email"]')).not.toBeNull();
  });

  it('confirms neutrally whether or not the account exists', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const input = root.querySelector<HTMLInputElement>('#forgot-email')!;
    input.value = 'nobody@cinesync.com';
    input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('If the account exists');
  });
});
