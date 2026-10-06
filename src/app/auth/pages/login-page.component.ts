import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { BILLBOARD_PATH, FORGOT_PASSWORD_PATH, REGISTER_PATH } from '../auth-paths';
import { AuthApiService } from '../data/auth-api.service';
import { AuthSessionService } from '../data/session-store';
import { safeReturnUrl } from '../return-url';
import { AuthModalComponent } from '../ui/auth-modal.component';
import { ToastService } from '../ui/toast.service';

@Component({
  selector: 'app-auth-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthModalComponent],
  styleUrl: './auth-form.css',
  template: `
    <app-auth-modal title="Iniciar sesión" titleId="login-title" (closed)="close()">
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group">
          <label for="login-email">Correo electrónico</label>
          <input id="login-email" class="form-input" type="email" autocomplete="username" placeholder="usuario@cinesync.com"
                 formControlName="email" [attr.aria-describedby]="showError('email') ? 'login-email-error' : null" />
          @if (showError('email')) {
            <span id="login-email-error" class="field-error">Ingresa un correo válido.</span>
          }
        </div>
        <div class="form-group">
          <label for="login-password">Contraseña</label>
          <input id="login-password" class="form-input" type="password" autocomplete="current-password" placeholder="••••••••"
                 formControlName="password" [attr.aria-describedby]="showError('password') ? 'login-password-error' : null" />
          @if (showError('password')) {
            <span id="login-password-error" class="field-error">Ingresa tu contraseña.</span>
          }
        </div>
        @if (failure(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
        <button class="btn-primary" type="submit" [disabled]="pending()">Ingresar</button>
      </form>
      <p class="auth-switch"><a [routerLink]="forgotPasswordPath">¿Olvidaste tu contraseña?</a></p>
      <p class="auth-switch">¿Aún no tienes cuenta? <a [routerLink]="registerPath">Regístrate aquí</a></p>
    </app-auth-modal>
  `,
})
export class LoginPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: [this.emailFromRegistration(), [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
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
    this.api.login(this.form.getRawValue()).subscribe({
      next: response => {
        this.session.start(response);
        this.toasts.show('Sesión iniciada correctamente.', 'success');
        void this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
      },
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
