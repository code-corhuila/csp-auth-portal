import { TestBed } from '@angular/core/testing';
import { RegisterPageComponent } from './register-page.component';

describe('RegisterPageComponent', () => {
  it('renders its heading', () => {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Create account');
  });
});
