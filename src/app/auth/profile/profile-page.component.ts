import { afterNextRender, Component, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { asApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { AuthSessionService } from '../data/session-store';
import { ToastService } from '../ui/toast.service';
import { PasswordSectionComponent } from './password-section.component';
import { ProfileDataSectionComponent } from './profile-data-section.component';
import { EmailChangeStep, profileErrorMessage } from './profile-error-message';

/**
 * Mi perfil (HU-AUTH-007, ADR-051) in three sections: personal data, email and password. The email section is the wireframes'
 * /profile in its two steps (ADR-034): ask for a new email, then confirm it with the 6-digit code.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, ProfileDataSectionComponent, PasswordSectionComponent],
  styleUrl: '../pages/auth-form.css',
  styles: `
    .profile { max-width: 460px; margin: 32px auto; padding: 0 16px; }
    .email-section { margin-top: 28px; }
    .auth-switch button { background: none; border: none; padding: 0; color: var(--color-brand-secondary); font: inherit; font-weight: 700; cursor: pointer; }
  `,
  template: `
    <section class="profile">
      <h1 #heading tabindex="-1">Mi perfil</h1>
      <app-profile-data-section />
      <section class="email-section" aria-labelledby="profile-email-title">
      <h2 id="profile-email-title">Correo electrónico</h2>
      <p>Correo actual: <strong>{{ session.user()?.email }}</strong></p>

      @if (step() === 'request') {
        <form class="auth-form" [formGroup]="emailForm" (ngSubmit)="requestCode()" novalidate>
          <div class="form-group">
            <label for="profile-email">Nuevo correo electrónico</label>
            <input id="profile-email" class="form-input" type="email" autocomplete="email" placeholder="usuario@cinesync.com"
                   formControlName="email" [attr.aria-describedby]="describedBy(emailInvalid(), 'profile-email-error')" />
            @if (emailInvalid()) {
              <span id="profile-email-error" class="field-error">Ingresa un correo válido.</span>
            }
          </div>
          <button class="btn-primary" type="submit" [disabled]="pending()">Enviar código</button>
        </form>
      } @else {
        <p role="status">Enviamos un código de 6 dígitos a {{ pendingEmail() }}. Vence en 15 minutos.</p>
        <form class="auth-form" [formGroup]="codeForm" (ngSubmit)="verify()" novalidate>
          <div class="form-group">
            <label for="profile-code">Código de verificación</label>
            <input #codeInput id="profile-code" class="form-input" type="text" inputmode="numeric" autocomplete="one-time-code"
                   maxlength="6" formControlName="verificationCode" [attr.aria-describedby]="describedBy(codeInvalid(), 'profile-code-error')" />
            @if (codeInvalid()) {
              <span id="profile-code-error" class="field-error">El código tiene 6 dígitos.</span>
            }
          </div>
          <button class="btn-primary" type="submit" [disabled]="pending()">Verificar correo</button>
        </form>
        <p class="auth-switch"><button type="button" (click)="restart()">Volver a pedir un código</button></p>
      }

      @if (failure(); as message) {
        <p id="profile-failure" class="form-error" role="alert">{{ message }}</p>
      }
      </section>
      <app-password-section />
    </section>
  `,
})
export class ProfilePageComponent {
  private readonly api = inject(AuthApiService);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly forms = inject(FormBuilder).nonNullable;
  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly submitted = signal(false);

  protected readonly session = inject(AuthSessionService);
  protected readonly emailForm = this.forms.group({ email: ['', [Validators.required, Validators.email]] });
  protected readonly codeForm = this.forms.group({ verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  protected readonly step = signal<EmailChangeStep>('request');
  protected readonly pending = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly pendingEmail = signal('');

  protected emailInvalid(): boolean {
    return this.submitted() && this.emailForm.invalid;
  }

  protected codeInvalid(): boolean {
    return this.submitted() && this.codeForm.invalid;
  }

  protected describedBy(invalid: boolean, fieldError: string): string | null {
    return [invalid ? fieldError : null, this.failure() ? 'profile-failure' : null].filter(Boolean).join(' ') || null;
  }

  protected requestCode(): void {
    this.submitted.set(true);
    if (this.emailForm.invalid || this.pending()) {
      return;
    }
    const email = this.emailForm.getRawValue().email.trim().toLowerCase();
    this.begin();
    this.api.requestEmailChange({ email }).subscribe({
      next: () => {
        this.pendingEmail.set(email);
        this.codeForm.reset();
        this.moveTo('verify');
        afterNextRender(() => this.codeInput()?.nativeElement.focus(), { injector: this.injector });
      },
      error: err => this.fail(err, 'request'),
    });
  }

  protected verify(): void {
    this.submitted.set(true);
    if (this.codeForm.invalid || this.pending()) {
      return;
    }
    this.begin();
    this.api.verifyEmailChange(this.codeForm.getRawValue()).subscribe({
      next: () => {
        this.session.updateEmail(this.pendingEmail());
        this.toasts.show(`Tu correo se actualizó a ${this.pendingEmail()}.`, 'success');
        this.emailForm.reset();
        this.codeForm.reset();
        this.moveTo('request');
        afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
      },
      error: err => this.fail(err, 'verify'),
    });
  }

  protected restart(): void {
    this.codeForm.reset();
    this.moveTo('request');
  }

  private begin(): void {
    this.pending.set(true);
    this.failure.set(null);
  }

  private moveTo(step: EmailChangeStep): void {
    this.step.set(step);
    this.submitted.set(false);
    this.failure.set(null);
    this.pending.set(false);
  }

  /** A taken address invalidates the pending request, so the person starts again from the email step. */
  private fail(err: unknown, step: EmailChangeStep): void {
    const error = asApiError(err);
    const message = profileErrorMessage(error, step);
    if (step === 'verify' && error.status === 409) {
      this.moveTo('request');
    }
    this.pending.set(false);
    this.failure.set(message);
  }
}
