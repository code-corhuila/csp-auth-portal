import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AuthSessionService } from '../data/session-store';
import { SYNTHETIC_USERS } from '../data/synthetic-users';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  const client = SYNTHETIC_USERS[0];
  let router: Router;
  let session: AuthSessionService;

  function create(returnUrl?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map(returnUrl ? [['returnUrl', returnUrl]] : []) } } },
      ],
    });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function submit(fixture: ReturnType<typeof create>, email: string, password: string) {
    const root: HTMLElement = fixture.nativeElement;
    const set = (id: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('login-email', email);
    set('login-password', password);
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    return root;
  }

  it('renders its heading and labelled fields', () => {
    const root: HTMLElement = create().nativeElement;
    expect(root.querySelector('h1')!.textContent).toContain('Sign in');
    expect(root.querySelector('label[for="login-email"]')).not.toBeNull();
    expect(root.querySelector('label[for="login-password"]')).not.toBeNull();
  });

  it('starts a session and goes to the requested route with a seeded user', () => {
    const fixture = create('/booking/seats');
    submit(fixture, client.email, client.password);
    expect(session.user()?.id).toBe(client.id);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/booking/seats');
  });

  it('goes to the billboard when no route was requested', () => {
    const fixture = create();
    submit(fixture, client.email, client.password);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/movies');
  });

  it('ignores a returnUrl that leaves the application', () => {
    const fixture = create('//evil.example');
    submit(fixture, client.email, client.password);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/movies');
  });

  it('shows an invalid-credentials message and creates no session', () => {
    const fixture = create();
    const root = submit(fixture, client.email, 'wrong-password');
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('Email or password is incorrect.');
    expect(session.isAuthenticated()).toBeFalse();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('reports a missing email next to its field without calling the service', () => {
    const fixture = create();
    const root = submit(fixture, '', client.password);
    const email = root.querySelector('#login-email')!;
    expect(email.getAttribute('aria-describedby')).toBe('login-email-error');
    expect(root.querySelector('#login-email-error')).not.toBeNull();
    expect(session.isAuthenticated()).toBeFalse();
  });
});
