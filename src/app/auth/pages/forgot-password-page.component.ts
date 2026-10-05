import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApiService } from '../data/auth-api.service';

@Component({
  selector: 'app-auth-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="forgot-password-title">
      <h1 id="forgot-password-title">Recover password</h1>
      <p>Request a link to reset your password.</p>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="forgot-email">Email</label>
        <input id="forgot-email" type="email" autocomplete="username" formControlName="email"
               [attr.aria-describedby]="invalid() ? 'forgot-email-error' : null" />
        @if (invalid()) {
          <p id="forgot-email-error">Enter a valid email.</p>
        }
        @if (sent()) {
          <p role="status">If the account exists, we sent a link to reset the password.</p>
        }
        <button type="submit" [disabled]="pending()">Send link</button>
      </form>
    </section>
  `,
})
export class ForgotPasswordPageComponent {
  private readonly api = inject(AuthApiService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly pending = signal(false);
  protected readonly sent = signal(false);
  private readonly submitted = signal(false);

  protected invalid(): boolean {
    return this.submitted() && this.form.invalid;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.api.requestPasswordReset(this.form.getRawValue()).subscribe(() => {
      this.sent.set(true);
      this.pending.set(false);
    });
  }
}
