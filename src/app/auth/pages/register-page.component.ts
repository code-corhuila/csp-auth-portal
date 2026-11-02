import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { BILLBOARD_PATH, LOGIN_PATH } from '../auth-paths';
import { REGISTER_COPY } from '../copy/auth-copy';
import { SignInFlow } from '../sign-in-flow.service';
import { AuthModalComponent } from '../ui/auth-modal.component';

type Field = 'firstName' | 'lastName' | 'address' | 'phone' | 'email' | 'password';

/**
 * Fields follow the mockup; the request follows RegisterRequest of csp-auth-api (ADR-024), so first and
 * last name travel joined as `name`. Like the mockup, registering does not sign in: it opens login.
 */
@Component({
  selector: 'app-auth-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthModalComponent],
  styleUrl: './auth-form.css',
  template: `
    <app-auth-modal [title]="copy.title" titleId="register-title" [maxWidth]="520" (closed)="close()">
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="register-firstName">{{ copy.firstName }}</label>
            <input id="register-firstName" class="form-input" type="text" autocomplete="given-name" [placeholder]="copy.firstNamePlaceholder"
                   formControlName="firstName" [attr.aria-describedby]="showError('firstName') ? 'register-firstName-error' : null" />
            @if (showError('firstName')) {
              <span id="register-firstName-error" class="field-error">{{ copy.firstNameRequired }}</span>
            }
          </div>
          <div class="form-group">
            <label for="register-lastName">{{ copy.lastName }}</label>
            <input id="register-lastName" class="form-input" type="text" autocomplete="family-name" [placeholder]="copy.lastNamePlaceholder"
                   formControlName="lastName" [attr.aria-describedby]="showError('lastName') ? 'register-lastName-error' : null" />
            @if (showError('lastName')) {
              <span id="register-lastName-error" class="field-error">{{ copy.lastNameRequired }}</span>
            }
          </div>
        </div>
        <div class="form-group">
          <label for="register-address">{{ copy.address }}</label>
          <input id="register-address" class="form-input" type="text" autocomplete="street-address" [placeholder]="copy.addressPlaceholder"
                 formControlName="address" [attr.aria-describedby]="showError('address') ? 'register-address-error' : null" />
          @if (showError('address')) {
            <span id="register-address-error" class="field-error">{{ copy.addressRequired }}</span>
          }
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="register-phone">{{ copy.phone }}</label>
            <input id="register-phone" class="form-input" type="tel" autocomplete="tel" [placeholder]="copy.phonePlaceholder"
                   formControlName="phone" [attr.aria-describedby]="showError('phone') ? 'register-phone-error' : null" />
            @if (showError('phone')) {
              <span id="register-phone-error" class="field-error">{{ copy.phoneInvalid }}</span>
            }
          </div>
          <div class="form-group">
            <label for="register-email">{{ copy.email }}</label>
            <input id="register-email" class="form-input" type="email" autocomplete="username" [placeholder]="copy.emailPlaceholder"
                   formControlName="email" [attr.aria-describedby]="showError('email') ? 'register-email-error' : null" />
            @if (showError('email')) {
              <span id="register-email-error" class="field-error">{{ copy.emailInvalid }}</span>
            }
          </div>
        </div>
        <div class="form-group">
          <label for="register-password">{{ copy.password }}</label>
          <input id="register-password" class="form-input" type="password" autocomplete="new-password" [placeholder]="copy.passwordPlaceholder"
                 formControlName="password" [attr.aria-describedby]="showError('password') ? 'register-password-error' : null" />
          @if (showError('password')) {
            <span id="register-password-error" class="field-error">{{ copy.passwordRequired }}</span>
          }
        </div>
        @if (failure(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
        <button class="btn-primary" type="submit" [disabled]="pending()">{{ copy.submit }}</button>
      </form>
      <p class="auth-switch">{{ copy.haveAccount }} <a [routerLink]="loginPath">{{ copy.loginLink }}</a></p>
    </app-auth-modal>
  `,
})
export class RegisterPageComponent {
  private readonly signInFlow = inject(SignInFlow);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(49)]],
    lastName: ['', [Validators.required, Validators.maxLength(49)]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly copy = REGISTER_COPY;
  protected readonly loginPath = LOGIN_PATH;
  protected readonly pending = signal(false);
  protected readonly failure = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected showError(field: Field): boolean {
    return this.submitted() && this.form.controls[field].invalid;
  }

  protected close(): void {
    void this.router.navigateByUrl(BILLBOARD_PATH);
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.failure.set(null);
    const { firstName, lastName, address, phone, email, password } = this.form.getRawValue();
    this.signInFlow.register({ name: `${firstName.trim()} ${lastName.trim()}`, email, password, phone, address }).subscribe({
      error: err => {
        this.failure.set(asApiError(err).userMessage);
        this.pending.set(false);
      },
    });
  }
}
