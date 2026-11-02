import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../shell-contract';
import { AuthApiService } from './data/auth-api.service';
import { AuthSessionService } from './data/session-store';
import { AuthResponse } from './model/auth';
import { SignInFlow } from './sign-in-flow.service';
import { ToastService } from './ui/toast.service';

describe('SignInFlow', () => {
  const credentials = { email: 'maria@cinesync.com', password: 'SecurePass123' };
  const registration = { ...credentials, name: 'Maria Perez', phone: '3001234567', address: 'Calle 1 #2-3' };
  const response: AuthResponse = {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresIn: 3600,
    user: { id: '1', email: credentials.email, roles: ['CLIENT'] },
  };
  const failure: ApiError = {
    status: 401, code: 'UNAUTHORIZED', message: 'x', details: [], traceId: 't', userMessage: 'Correo o contraseña incorrectos.',
  };

  let api: jasmine.SpyObj<AuthApiService>;
  let flow: SignInFlow;
  let session: AuthSessionService;
  let router: Router;
  let toasts: ToastService;

  beforeEach(() => {
    api = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['login', 'register']);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthApiService, useValue: api }] });
    flow = TestBed.inject(SignInFlow);
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    toasts = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(toasts, 'show');
  });

  afterEach(() => session.end());

  describe('signIn', () => {
    it('starts the session with the response, confirms and goes to the requested route', () => {
      api.login.and.returnValue(of(response));
      flow.signIn(credentials, '/booking/seats').subscribe();
      expect(api.login).toHaveBeenCalledOnceWith(credentials);
      expect(session.user()?.id).toBe('1');
      expect(session.accessToken()).toBe('access');
      expect(toasts.show).toHaveBeenCalledOnceWith('Sesión iniciada correctamente.', 'success');
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/booking/seats');
    });

    it('goes to the billboard when no route was requested', () => {
      api.login.and.returnValue(of(response));
      flow.signIn(credentials, null).subscribe();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/movies');
    });

    it('goes to the billboard when the requested route leaves the application', () => {
      api.login.and.returnValue(of(response));
      flow.signIn(credentials, '//evil.example').subscribe();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/movies');
    });

    it('hands the failure to the caller and changes nothing', () => {
      api.login.and.returnValue(throwError(() => failure));
      let received: unknown;
      flow.signIn(credentials, '/booking').subscribe({ error: err => (received = err) });
      expect(received).toBe(failure);
      expect(session.isAuthenticated()).toBeFalse();
      expect(toasts.show).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('does nothing until the stream is subscribed', () => {
      api.login.and.returnValue(of(response));
      flow.signIn(credentials, null);
      expect(session.isAuthenticated()).toBeFalse();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('confirms, opens login with the email in the navigation state and starts no session', () => {
      api.register.and.returnValue(of(response));
      flow.register(registration).subscribe();
      expect(api.register).toHaveBeenCalledOnceWith(registration);
      expect(toasts.show).toHaveBeenCalledOnceWith('Registro exitoso. Ahora inicia sesión con tus datos.', 'success');
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/auth/login', { state: { email: credentials.email } });
      expect(session.isAuthenticated()).toBeFalse();
    });

    it('hands the failure to the caller and changes nothing', () => {
      api.register.and.returnValue(throwError(() => failure));
      let received: unknown;
      flow.register(registration).subscribe({ error: err => (received = err) });
      expect(received).toBe(failure);
      expect(toasts.show).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
