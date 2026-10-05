import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { BILLBOARD_PATH, LOGIN_PATH } from '../auth-paths';
import { AuthApiService } from '../data/auth-api.service';
import { AuthSessionService } from '../data/session-store';

type Field = 'name' | 'email' | 'password';

/** Fields mirror RegisterRequest of csp-auth-api (name, email, password); the mockup's extra profile fields have no contract yet. */
@Component({
  selector: 'app-auth-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: './auth-form.css',
  template: `
    <section class="auth-card" aria-labelledby="register-title">
      <h1 id="register-title">Crear cuenta</h1>
      <p>Crea tu cuenta de Cinesync.</p>
      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group">
          <label for="register-name">Nombre completo</label>
          <input id="register-name" class="form-input" type="text" autocomplete="name" placeholder="Ej. Juan Carlos Pérez"
                 formControlName="name" [attr.aria-describedby]="showError('name') ? 'register-name-error' : null" />
          @if (showError('name')) {
            <span id="register-name-error" class="field-error">Ingresa tu nombre.</span>
          }
        </div>
        <div class="form-group">
          <label for="register-email">Correo electrónico</label>
          <input id="register-email" class="form-input" type="email" autocomplete="username" placeholder="juan@cinesync.com"
                 formControlName="email" [attr.aria-describedby]="showError('email') ? 'register-email-error' : null" />
          @if (showError('email')) {
            <span id="register-email-error" class="field-error">Ingresa un correo válido.</span>
          }
        </div>
        <div class="form-group">
          <label for="register-password">Contraseña</label>
          <input id="register-password" class="form-input" type="password" autocomplete="new-password" placeholder="••••••••"
                 formControlName="password" [attr.aria-describedby]="showError('password') ? 'register-password-error' : null" />
          @if (showError('password')) {
            <span id="register-password-error" class="field-error">Ingresa una contraseña.</span>
          }
        </div>
        @if (failure(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
        <button class="btn-primary" type="submit" [disabled]="pending()">Registrarse</button>
      </form>
      <p class="auth-switch">¿Ya tienes una cuenta? <a [routerLink]="loginPath">Inicia sesión</a></p>
    </section>
  `,
})
export class RegisterPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly loginPath = LOGIN_PATH;
  protected readonly pending = signal(false);
  protected readonly failure = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected showError(field: Field): boolean {
    return this.submitted() && this.form.controls[field].invalid;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.failure.set(null);
    this.api.register(this.form.getRawValue()).subscribe({
      next: response => {
        this.session.start(response);
        void this.router.navigateByUrl(BILLBOARD_PATH);
      },
      error: err => {
        this.failure.set(asApiError(err).userMessage);
        this.pending.set(false);
      },
    });
  }
}
