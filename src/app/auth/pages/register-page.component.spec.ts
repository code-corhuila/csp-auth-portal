import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthSessionService } from '../data/session-store';
import { SYNTHETIC_USERS } from '../data/synthetic-users';
import { RegisterPageComponent } from './register-page.component';

describe('RegisterPageComponent', () => {
  let router: Router;
  let session: AuthSessionService;

  function create() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(RegisterPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function submit(fixture: ReturnType<typeof create>, name: string, email: string, password: string) {
    const root: HTMLElement = fixture.nativeElement;
    const set = (id: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('register-name', name);
    set('register-email', email);
    set('register-password', password);
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    return root;
  }

  it('renders its heading and labelled fields', () => {
    const root: HTMLElement = create().nativeElement;
    expect(root.querySelector('h1')!.textContent).toContain('Crear cuenta');
    for (const id of ['register-name', 'register-email', 'register-password']) {
      expect(root.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
  });

  it('registers a new CLIENT, starts the session and goes to the billboard', () => {
    const fixture = create();
    submit(fixture, 'Ana Perez', 'ana@cinesync.com', 'SecurePass123!');
    expect(session.user()?.email).toBe('ana@cinesync.com');
    expect(session.hasRole('ADMIN')).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/movies');
  });

  it('rejects an email that is already registered and creates no session', () => {
    const fixture = create();
    const root = submit(fixture, 'Maria', SYNTHETIC_USERS[0].email, 'SecurePass123!');
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('ya está registrado');
    expect(session.isAuthenticated()).toBeFalse();
  });

  it('reports an empty name next to its field', () => {
    const fixture = create();
    const root = submit(fixture, '', 'ana@cinesync.com', 'SecurePass123!');
    expect(root.querySelector('#register-name')!.getAttribute('aria-describedby')).toBe('register-name-error');
    expect(session.isAuthenticated()).toBeFalse();
  });
});
