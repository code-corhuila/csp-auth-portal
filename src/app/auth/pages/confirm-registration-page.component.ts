import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { LOGIN_PATH, REGISTER_PATH } from '../auth-paths';
import { CONFIRM_REGISTRATION_COPY } from '../copy/auth-copy';
import { AuthApiService } from '../data/auth-api.service';
import { confirmRegistrationOutcome } from '../registration-error-message';
import { AuthModalComponent } from '../ui/auth-modal.component';

const TOKEN_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type State = 'confirming' | 'confirmed' | 'rejected' | 'registered' | 'failed';

/**
 * Last step of the registration (issue csp-docs#282). The link of the email is `/auth/confirm-registration#token=<uuid>`: the
 * token travels in the URL fragment, which browsers never send to a server. The page reads it once, keeps it only in memory
 * and replaces the address so neither the address bar nor the history keeps it. It is never logged or shown. Opening the link
 * is the confirmation, so the call is made at once with one Idempotency-Key for this opening. Like the mockup, it does not
 * sign in: it points to login.
 */
@Component({
  selector: 'app-auth-confirm-registration-page',
  standalone: true,
  imports: [RouterLink, AuthModalComponent],
  styleUrl: './auth-form.css',
  template: `
    <app-auth-modal [title]="copy.title" titleId="confirm-registration-title" (closed)="close()">
      @switch (state()) {
        @case ('confirming') {
          <p class="form-status" role="status">{{ copy.confirming }}</p>
        }
        @case ('confirmed') {
          <p class="form-status" role="status">{{ copy.confirmed }}</p>
          <p class="auth-switch"><a [routerLink]="loginPath" data-initial-focus>{{ copy.loginLink }}</a></p>
        }
        @case ('registered') {
          <p class="form-status" role="status">{{ copy.alreadyRegistered }}</p>
          <p class="auth-switch"><a [routerLink]="loginPath" data-initial-focus>{{ copy.loginLink }}</a></p>
        }
        @case ('rejected') {
          <p class="form-error" role="alert">{{ copy.rejected }}</p>
          <p class="auth-switch"><a [routerLink]="registerPath" data-initial-focus>{{ copy.registerLink }}</a></p>
        }
        @default {
          <p class="form-error" role="alert">{{ failure() }}</p>
        }
      }
    </app-auth-modal>
  `,
})
export class ConfirmRegistrationPageComponent {
  private readonly router = inject(Router);

  protected readonly copy = CONFIRM_REGISTRATION_COPY;
  protected readonly loginPath = LOGIN_PATH;
  protected readonly registerPath = REGISTER_PATH;
  protected readonly state = signal<State>('confirming');
  protected readonly failure = signal('');

  constructor() {
    const route = inject(ActivatedRoute);
    const candidate = new URLSearchParams(route.snapshot.fragment ?? '').get('token');
    void this.router.navigate([], { relativeTo: route, replaceUrl: true });
    if (candidate === null || !TOKEN_FORMAT.test(candidate)) {
      this.state.set('rejected');
      return;
    }
    inject(AuthApiService).confirmRegistration({ token: candidate }, crypto.randomUUID()).subscribe({
      next: () => this.state.set('confirmed'),
      error: err => {
        const outcome = confirmRegistrationOutcome(asApiError(err));
        this.failure.set(outcome.message);
        this.state.set(outcome.state);
      },
    });
  }

  protected close(): void {
    void this.router.navigateByUrl(LOGIN_PATH);
  }
}
