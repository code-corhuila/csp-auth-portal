import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { AuthSessionService } from '../data/session-store';
import { safeReturnUrl } from '../return-url';

@Component({
  selector: 'app-auth-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="login-title">
      <h1 id="login-title">Sign in</h1>
      <p>Sign in to your Cinesync account.</p>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="login-email">Email</label>
        <input id="login-email" type="email" autocomplete="username" formControlName="email"
               [attr.aria-describedby]="showError('email') ? 'login-email-error' : null" />
        @if (showError('email')) {
          <p id="login-email-error">Enter a valid email.</p>
        }
        <label for="login-password">Password</label>
        <input id="login-password" type="password" autocomplete="current-password" formControlName="password"
               [attr.aria-describedby]="showError('password') ? 'login-password-error' : null" />
        @if (showError('password')) {
          <p id="login-password-error">Enter your password.</p>
        }
        @if (failure(); as message) {
          <p role="alert">{{ message }}</p>
        }
        <button type="submit" [disabled]="pending()">Sign in</button>
      </form>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly pending = signal(false);
  protected readonly failure = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected showError(field: 'email' | 'password'): boolean {
    return this.submitted() && this.form.controls[field].invalid;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.failure.set(null);
    this.api.login(this.form.getRawValue()).subscribe({
      next: response => {
        this.session.start(response);
        void this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
      },
      error: err => {
        this.failure.set(asApiError(err).userMessage);
        this.pending.set(false);
      },
    });
  }
}
