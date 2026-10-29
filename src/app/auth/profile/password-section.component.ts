import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { asApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { AuthSessionService } from '../data/session-store';
import { PASSWORD_RULES_HINT, passwordRules } from '../password-rules';
import { ToastService } from '../ui/toast.service';
import { PasswordChangeFailure, passwordChangeFailure } from './profile-error-message';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('confirmation')?.value ? null : { mismatch: true };
}

/**
 * "Contraseña" of Mi perfil (HU-AUTH-007, ADR-051): current password, new password and its confirmation. The API answers 200 with a
 * fresh session for this device and revokes every other one, so the response is started exactly like a login: the new access token
 * stays in memory and the new refresh token replaces the kept one. The passwords are never logged, kept or compared with anything else.
 */
@Component({
  selector: 'app-password-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  styleUrl: '../pages/auth-form.css',
  styles: `:host { display: block; margin-top: 28px; }`,
  template: `
    <section aria-labelledby="password-title">
      <h2 id="password-title">Contraseña</h2>
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group">
          <label for="password-current">Contraseña actual</label>
          <input id="password-current" class="form-input" type="password" autocomplete="current-password" placeholder="••••••••"
                 formControlName="currentPassword" [attr.aria-describedby]="describedBy(currentError(), 'password-current-error')" />
          @if (currentError(); as message) {
            <span id="password-current-error" class="field-error">{{ message }}</span>
          }
        </div>
        <div class="form-group">
          <label for="password-new">Nueva contraseña</label>
          <input id="password-new" class="form-input" type="password" autocomplete="new-password" placeholder="••••••••"
                 formControlName="newPassword" [attr.aria-describedby]="describedBy(newError(), 'password-new-error')" />
          @if (newError(); as message) {
            <span id="password-new-error" class="field-error">{{ message }}</span>
          }
        </div>
        <div class="form-group">
          <label for="password-confirmation">Confirmar nueva contraseña</label>
          <input id="password-confirmation" class="form-input" type="password" autocomplete="new-password" placeholder="••••••••"
                 formControlName="confirmation" [attr.aria-describedby]="describedBy(confirmationError(), 'password-confirmation-error')" />
          @if (confirmationError(); as message) {
            <span id="password-confirmation-error" class="field-error">{{ message }}</span>
          }
        </div>
        @if (formFailure(); as message) {
          <p id="password-failure" class="form-error" role="alert">{{ message }}</p>
        }
        <button class="btn-primary" type="submit" [disabled]="pending()">Cambiar contraseña</button>
      </form>
    </section>
  `,
})
export class PasswordSectionComponent {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toasts = inject(ToastService);
  private readonly submitted = signal(false);
  private readonly rejection = signal<PasswordChangeFailure | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordRules]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  protected readonly pending = signal(false);

  protected currentError(): string | null {
    if (this.rejection()?.field === 'currentPassword') {
      return this.rejection()!.message;
    }
    return this.submitted() && this.form.controls.currentPassword.invalid ? 'Ingresa tu contraseña actual.' : null;
  }

  protected newError(): string | null {
    if (this.rejection()?.field === 'newPassword') {
      return this.rejection()!.message;
    }
    return this.submitted() && this.form.controls.newPassword.invalid ? PASSWORD_RULES_HINT : null;
  }

  protected confirmationError(): string | null {
    return this.submitted() && this.form.controls.newPassword.valid && this.form.hasError('mismatch') ? 'Las contraseñas no coinciden.' : null;
  }

  protected formFailure(): string | null {
    const rejection = this.rejection();
    return rejection !== null && rejection.field === null ? rejection.message : null;
  }

  protected describedBy(fieldError: string | null, fieldErrorId: string): string | null {
    return [fieldError ? fieldErrorId : null, this.formFailure() ? 'password-failure' : null].filter(Boolean).join(' ') || null;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.rejection.set(null);
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.api.changeMyPassword({ currentPassword, newPassword }).subscribe({
      next: response => {
        this.session.start(response);
        this.form.reset();
        this.submitted.set(false);
        this.pending.set(false);
        this.toasts.show('Tu contraseña se actualizó. Cerramos tus otras sesiones.', 'success');
      },
      error: err => {
        this.rejection.set(passwordChangeFailure(asApiError(err)));
        this.pending.set(false);
      },
    });
  }
}
