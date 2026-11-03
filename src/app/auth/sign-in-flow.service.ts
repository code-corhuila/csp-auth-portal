import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LOGIN_COPY, REGISTER_COPY } from './copy/auth-copy';
import { AuthApiService } from './data/auth-api.service';
import { AuthSessionService } from './data/session-store';
import { AuthResponse, LoginRequest, RegisterRequest, RegistrationRequested } from './model/auth';
import { safeReturnUrl } from './return-url';
import { ToastService } from './ui/toast.service';

/**
 * What happens when a person signs in or registers, apart from the screens that ask for it: the call to
 * csp-auth-api, the start of the session, the confirmation and where to go next. The pages keep the form
 * and the failure message; a failure reaches them untouched through the returned stream.
 */
@Injectable({ providedIn: 'root' })
export class SignInFlow {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** Starts the session and goes to `returnUrl` when it stays inside the application, otherwise to the billboard. */
  signIn(credentials: LoginRequest, returnUrl: string | null): Observable<AuthResponse> {
    return this.api.login(credentials).pipe(
      tap(response => {
        this.session.start(response);
        this.toasts.show(LOGIN_COPY.signedIn, 'success');
        void this.router.navigateByUrl(safeReturnUrl(returnUrl));
      }),
    );
  }

  /**
   * Registering neither signs in nor creates the account: the owner of the mailbox confirms it with the link of the email. The
   * answer is the same for an email that already has an account, so the person is only asked to check the email.
   */
  register(request: RegisterRequest): Observable<RegistrationRequested> {
    return this.api.register(request).pipe(tap(() => this.toasts.show(REGISTER_COPY.checkEmailToast, 'success')));
  }
}
