import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthApiService } from '../data/auth-api.service';
import { AuthSessionService } from '../data/session-store';
import { SYNTHETIC_USERS } from '../data/synthetic-users';
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
  let router: Router;
  let session: AuthSessionService;
  let toasts: ToastService;

  function create() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
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

  it('registers without signing in, then opens login with the email and a toast', () => {
    submit(create());
    expect(session.isAuthenticated()).toBeFalse();
    expect(toasts.show).toHaveBeenCalledWith('Registro exitoso. Ahora inicia sesión con tus datos.', 'success');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login', { state: { email: 'juan@cinesync.com' } });
  });

  it('sends first and last name joined as name, with phone and address', () => {
    const fixture = create();
    const api = TestBed.inject(AuthApiService);
    spyOn(api, 'register').and.callThrough();
    submit(fixture);
    expect(api.register).toHaveBeenCalledWith({
      name: 'Juan Carlos Pérez Gómez',
      email: 'juan@cinesync.com',
      password: 'SecurePass123!',
      phone: '3001234567',
      address: 'Calle 123 #45-67',
    });
  });

  it('rejects an email that is already registered and stays open', () => {
    const root = submit(create(), { email: SYNTHETIC_USERS[0].email });
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('ya está registrado');
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
