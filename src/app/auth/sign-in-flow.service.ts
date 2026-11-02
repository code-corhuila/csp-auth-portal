import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LOGIN_PATH } from './auth-paths';
import { LOGIN_COPY, REGISTER_COPY } from './copy/auth-copy';
import { AuthApiService } from './data/auth-api.service';
import { AuthSessionService } from './data/session-store';
import { AuthResponse, LoginRequest, RegisterRequest } from './model/auth';
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

  /** Registering does not sign in: it opens login with the email handed over in the navigation state, never in the URL. */
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api.register(request).pipe(
      tap(() => {
        this.toasts.show(REGISTER_COPY.registered, 'success');
        void this.router.navigateByUrl(LOGIN_PATH, { state: { email: request.email } });
      }),
    );
  }
}
