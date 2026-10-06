import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AuthSessionService } from '../data/session-store';
import { SYNTHETIC_USERS } from '../data/synthetic-users';
import { ToastService } from '../ui/toast.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  const client = SYNTHETIC_USERS[0];
  let router: Router;
  let session: AuthSessionService;
  let toasts: ToastService;

  function create(options: { returnUrl?: string; state?: object } = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map(options.returnUrl ? [['returnUrl', options.returnUrl]] : []) } } },
      ],
    });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
    toasts = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(toasts, 'show');
    spyOn(TestBed.inject(Location), 'getState').and.returnValue(options.state ?? null);
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function set(root: HTMLElement, id: string, value: string) {
    const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(fixture: ReturnType<typeof create>, email: string, password: string) {
    const root: HTMLElement = fixture.nativeElement;
    set(root, 'login-email', email);
    set(root, 'login-password', password);
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    return root;
  }

  it('opens as a modal with its title and labelled fields', () => {
    const root: HTMLElement = create().nativeElement;
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    expect(root.querySelector('h1')!.textContent).toContain('Iniciar sesión');
    expect(root.querySelector('label[for="login-email"]')).not.toBeNull();
    expect(root.querySelector('label[for="login-password"]')).not.toBeNull();
  });

  it('starts a session, confirms with a toast and goes to the requested route', () => {
    const fixture = create({ returnUrl: '/booking/seats' });
    submit(fixture, client.email, client.password);
    expect(session.user()?.id).toBe(client.id);
    expect(toasts.show).toHaveBeenCalledWith('Sesión iniciada correctamente.', 'success');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/booking/seats');
  });

  it('goes to the billboard when no route was requested', () => {
    submit(create(), client.email, client.password);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/movies');
  });

  it('ignores a returnUrl that leaves the application', () => {
    submit(create({ returnUrl: '//evil.example' }), client.email, client.password);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/movies');
  });

  it('shows an invalid-credentials message and creates no session', () => {
    const root = submit(create(), client.email, 'wrong-password');
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('Correo o contraseña incorrectos.');
    expect(session.isAuthenticated()).toBeFalse();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('reports a missing email next to its field without calling the service', () => {
    const root = submit(create(), '', client.password);
    expect(root.querySelector('#login-email')!.getAttribute('aria-describedby')).toBe('login-email-error');
    expect(root.querySelector('#login-email-error')).not.toBeNull();
    expect(session.isAuthenticated()).toBeFalse();
  });

  it('fills the email that registration passed along', () => {
    const root: HTMLElement = create({ state: { email: 'ana@cinesync.com' } }).nativeElement;
    expect(root.querySelector<HTMLInputElement>('#login-email')!.value).toBe('ana@cinesync.com');
    expect(root.querySelector<HTMLInputElement>('#login-password')!.value).toBe('');
  });

  it('closes back to the billboard', () => {
    const fixture = create();
    (fixture.nativeElement.querySelector('.auth-close') as HTMLButtonElement).click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/movies');
  });

  it('links to the registration', () => {
    expect(create().nativeElement.querySelector('a[href="/auth/register"]')).not.toBeNull();
  });
});
