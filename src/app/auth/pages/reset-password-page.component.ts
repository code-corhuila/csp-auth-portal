import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { FORGOT_PASSWORD_PATH, LOGIN_PATH } from '../auth-paths';
import { AuthApiService } from '../data/auth-api.service';
import { passwordResetErrorMessage } from '../password-reset-error-message';
import { passwordRules } from '../password-rules';
import { AuthModalComponent } from '../ui/auth-modal.component';

const TOKEN_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirmation')?.value ? null : { mismatch: true };
}

/**
 * Last step of the password recovery (HU-AUTH-006, ADR-050). The link of the email is `/auth/reset-password#token=<uuid>`:
 * the token travels in the URL fragment, which browsers never send to a server. The page reads it once, keeps it only in
 * memory and replaces the address so neither the address bar nor the history keeps it. It is never logged or shown.
 */
@Component({
  selector: 'app-auth-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthModalComponent],
  styleUrl: './auth-form.css',
  template: `
    <app-auth-modal title="Nueva contraseña" titleId="reset-password-title" (closed)="close()">
      @if (done()) {
        <p class="form-status" role="status">Tu contraseña se actualizó. Inicia sesión con la nueva contraseña.</p>
        <p class="auth-switch"><a [routerLink]="loginPath" data-initial-focus>Ir a iniciar sesión</a></p>
      } @else if (linkRejected()) {
        <p class="form-error" role="alert">El enlace no es válido o ya venció. Solicita uno nuevo.</p>
        <p class="auth-switch"><a [routerLink]="forgotPath" data-initial-focus>Solicitar un enlace nuevo</a></p>
      } @else {
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-group">
            <label for="reset-password">Nueva contraseña</label>
            <input id="reset-password" class="form-input" type="password" autocomplete="new-password" placeholder="••••••••"
                   formControlName="password" [attr.aria-describedby]="weak() ? 'reset-password-error' : null" />
            @if (weak()) {
              <span id="reset-password-error" class="field-error">De 8 a 72 caracteres, una mayúscula y un número.</span>
            }
          </div>
          <div class="form-group">
            <label for="reset-confirmation">Confirmar contraseña</label>
            <input id="reset-confirmation" class="form-input" type="password" autocomplete="new-password" placeholder="••••••••"
                   formControlName="confirmation" [attr.aria-describedby]="mismatched() ? 'reset-confirmation-error' : null" />
            @if (mismatched()) {
              <span id="reset-confirmation-error" class="field-error">Las contraseñas no coinciden.</span>
            }
          </div>
          @if (failure(); as message) {
            <p class="form-error" role="alert">{{ message }}</p>
          }
          <button class="btn-primary" type="submit" [disabled]="pending()">Cambiar contraseña</button>
        </form>
        <p class="auth-switch"><a [routerLink]="loginPath">Volver a iniciar sesión</a></p>
      }
    </app-auth-modal>
  `,
})
export class ResetPasswordPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly token: string | null;

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, passwordRules]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  protected readonly loginPath = LOGIN_PATH;
  protected readonly forgotPath = FORGOT_PASSWORD_PATH;
  protected readonly pending = signal(false);
  protected readonly done = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly linkRejected = signal(false);
  private readonly submitted = signal(false);

  constructor() {
    const route = inject(ActivatedRoute);
    const candidate = new URLSearchParams(route.snapshot.fragment ?? '').get('token');
    this.token = candidate !== null && TOKEN_FORMAT.test(candidate) ? candidate : null;
    this.linkRejected.set(this.token === null);
    void this.router.navigate([], { relativeTo: route, replaceUrl: true });
  }

  protected weak(): boolean {
    return this.submitted() && this.form.controls.password.invalid;
  }

  protected mismatched(): boolean {
    return this.submitted() && !this.weak() && this.form.hasError('mismatch');
  }

  protected close(): void {
    void this.router.navigateByUrl(LOGIN_PATH);
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.token === null || this.form.invalid || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.failure.set(null);
    this.api.resetPassword({ token: this.token, password: this.form.controls.password.value }).subscribe({
      next: () => {
        this.done.set(true);
        this.pending.set(false);
      },
      error: err => {
        const error = asApiError(err);
        if (error.status === 401) {
          this.linkRejected.set(true);
        } else {
          this.failure.set(passwordResetErrorMessage(error, 'reset'));
        }
        this.pending.set(false);
      },
    });
  }
}
