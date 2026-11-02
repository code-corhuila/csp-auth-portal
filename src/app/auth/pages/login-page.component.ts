import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { BILLBOARD_PATH, FORGOT_PASSWORD_PATH, REGISTER_PATH } from '../auth-paths';
import { LOGIN_COPY } from '../copy/auth-copy';
import { SignInFlow } from '../sign-in-flow.service';
import { AuthModalComponent } from '../ui/auth-modal.component';

@Component({
  selector: 'app-auth-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthModalComponent],
  styleUrl: './auth-form.css',
  template: `
    <app-auth-modal [title]="copy.title" titleId="login-title" (closed)="close()">
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group">
          <label for="login-email">{{ copy.email }}</label>
          <input id="login-email" class="form-input" type="email" autocomplete="username" [placeholder]="copy.emailPlaceholder"
                 formControlName="email" [attr.aria-describedby]="showError('email') ? 'login-email-error' : null" />
          @if (showError('email')) {
            <span id="login-email-error" class="field-error">{{ copy.emailInvalid }}</span>
          }
        </div>
        <div class="form-group">
          <label for="login-password">{{ copy.password }}</label>
          <input id="login-password" class="form-input" type="password" autocomplete="current-password" [placeholder]="copy.passwordPlaceholder"
                 formControlName="password" [attr.aria-describedby]="showError('password') ? 'login-password-error' : null" />
          @if (showError('password')) {
            <span id="login-password-error" class="field-error">{{ copy.passwordRequired }}</span>
          }
        </div>
        @if (failure(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
        <button class="btn-primary" type="submit" [disabled]="pending()">{{ copy.submit }}</button>
      </form>
      <p class="auth-switch"><a [routerLink]="forgotPasswordPath">{{ copy.forgotPassword }}</a></p>
      <p class="auth-switch">{{ copy.noAccount }} <a [routerLink]="registerPath">{{ copy.registerLink }}</a></p>
    </app-auth-modal>
  `,
})
export class LoginPageComponent {
  private readonly signInFlow = inject(SignInFlow);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: [this.emailFromRegistration(), [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly copy = LOGIN_COPY;
  protected readonly registerPath = REGISTER_PATH;
  protected readonly forgotPasswordPath = FORGOT_PASSWORD_PATH;
  protected readonly pending = signal(false);
  protected readonly failure = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected showError(field: 'email' | 'password'): boolean {
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
    this.signInFlow.signIn(this.form.getRawValue(), this.route.snapshot.queryParamMap.get('returnUrl')).subscribe({
      error: err => {
        this.failure.set(asApiError(err).userMessage);
        this.pending.set(false);
      },
    });
  }

  /** Registration hands the email over in the navigation state, never in the URL. */
  private emailFromRegistration(): string {
    const state = inject(Location).getState() as { email?: unknown } | null;
    return typeof state?.email === 'string' ? state.email : '';
  }
}
