import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LOGIN_PATH } from '../auth-paths';
import { AuthApiService } from '../data/auth-api.service';
import { AuthModalComponent } from '../ui/auth-modal.component';

@Component({
  selector: 'app-auth-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthModalComponent],
  styleUrl: './auth-form.css',
  template: `
    <app-auth-modal title="Recuperar contraseña" titleId="forgot-password-title" (closed)="close()">
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group">
          <label for="forgot-email">Correo electrónico</label>
          <input id="forgot-email" class="form-input" type="email" autocomplete="username" placeholder="usuario@cinesync.com"
                 formControlName="email" [attr.aria-describedby]="invalid() ? 'forgot-email-error' : null" />
          @if (invalid()) {
            <span id="forgot-email-error" class="field-error">Ingresa un correo válido.</span>
          }
        </div>
        @if (sent()) {
          <p class="form-status" role="status">Si la cuenta existe, enviamos un enlace para restablecer la contraseña.</p>
        }
        <button class="btn-primary" type="submit" [disabled]="pending()">Enviar enlace</button>
      </form>
      <p class="auth-switch"><a [routerLink]="loginPath">Volver a iniciar sesión</a></p>
    </app-auth-modal>
  `,
})
export class ForgotPasswordPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly loginPath = LOGIN_PATH;
  protected readonly pending = signal(false);
  protected readonly sent = signal(false);
  private readonly submitted = signal(false);

  protected invalid(): boolean {
    return this.submitted() && this.form.invalid;
  }

  protected close(): void {
    void this.router.navigateByUrl(LOGIN_PATH);
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
