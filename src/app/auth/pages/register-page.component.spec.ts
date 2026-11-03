import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApiService } from '../data/auth-api.service';
import { ApiError } from '../../shell-contract';
import { AuthSessionService } from '../data/session-store';
import { ToastService } from '../ui/toast.service';
import { RegisterPageComponent } from './register-page.component';

interface Form {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
  password: string;
}

const valid: Form = {
  firstName: 'Juan Carlos',
  lastName: 'Pérez Gómez',
  address: 'Calle 123 #45-67',
  phone: '3001234567',
  email: 'juan@cinesync.com',
  password: 'SecurePass123!',
};

describe('RegisterPageComponent', () => {
  const busy: ApiError = {
    status: 503, code: 'SERVICE_UNAVAILABLE', message: 'x', details: [], traceId: 't', userMessage: 'El servicio no está disponible.',
  };
  // The API answers the same for an email that has an account and for a free one (issue csp-docs#282): the page cannot tell them apart.
  const api = {
    register: (request: { email: string }) => (request.email === 'busy@cinesync.com' ? throwError(() => busy) : of({ id: 'request-1' })),
  };
  let router: Router;
  let session: AuthSessionService;
  let toasts: ToastService;

  function create() {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthApiService, useValue: api }] });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
    toasts = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(toasts, 'show');
    const fixture = TestBed.createComponent(RegisterPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function submit(fixture: ReturnType<typeof create>, overrides: Partial<Form> = {}) {
    const root: HTMLElement = fixture.nativeElement;
    const values = { ...valid, ...overrides };
    for (const [field, value] of Object.entries(values)) {
      const input = root.querySelector<HTMLInputElement>(`#register-${field}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    return root;
  }

  it('opens as a modal with the fields of the mockup', () => {
    const root: HTMLElement = create().nativeElement;
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    expect(root.querySelector('h1')!.textContent).toContain('Crear cuenta');
    for (const field of ['firstName', 'lastName', 'address', 'phone', 'email', 'password']) {
      expect(root.querySelector(`label[for="register-${field}"]`)).not.toBeNull();
    }
  });

  it('asks the person to check the email, with a toast, and starts no session', () => {
    const root = submit(create());
    expect(session.isAuthenticated()).toBeFalse();
    expect(toasts.show).toHaveBeenCalledWith('Revisa tu correo para confirmar tu cuenta.', 'success');
    expect(root.querySelector('h1')!.textContent).toContain('Revisa tu correo');
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Si el correo puede registrarse');
    expect(root.querySelector('form')).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows the same message whether the email already has an account or not and never says which', () => {
    const free = submit(create(), { email: 'free@cinesync.com' }).textContent;
    TestBed.resetTestingModule();
    const taken = submit(create(), { email: 'taken@cinesync.com' }).textContent;
    expect(taken).toBe(free);
    expect(taken).not.toContain('ya está registrado');
  });

  it('sends first and last name joined as name, with phone and address', () => {
    const fixture = create();
    const register = spyOn(TestBed.inject(AuthApiService), 'register').and.callThrough();
    submit(fixture);
    expect(register).toHaveBeenCalledWith({
      name: 'Juan Carlos Pérez Gómez',
      email: 'juan@cinesync.com',
      password: 'SecurePass123!',
      phone: '3001234567',
      address: 'Calle 123 #45-67',
    });
  });

  it('shows the failure of the service, stays open and lets the person try again', () => {
    const fixture = create();
    const root = submit(fixture, { email: 'busy@cinesync.com' });
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('El servicio no está disponible.');
    expect(root.querySelector('form')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeFalse();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('reports an empty first name next to its field', () => {
    const root = submit(create(), { firstName: '' });
    expect(root.querySelector('#register-firstName')!.getAttribute('aria-describedby')).toBe('register-firstName-error');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('rejects a phone that is not digits with an optional plus', () => {
    const root = submit(create(), { phone: '30-abc' });
    expect(root.querySelector('#register-phone')!.getAttribute('aria-describedby')).toBe('register-phone-error');
  });

  it('requires the address', () => {
    const root = submit(create(), { address: '' });
    expect(root.querySelector('#register-address')!.getAttribute('aria-describedby')).toBe('register-address-error');
  });

  it('links back to login and closes to the billboard', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('a[href="/auth/login"]')).not.toBeNull();
    (fixture.nativeElement.querySelector('.auth-close') as HTMLButtonElement).click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/movies');
  });
});
