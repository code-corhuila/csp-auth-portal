import { TestBed } from '@angular/core/testing';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  it('renders its heading', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Sign in');
  });
});
