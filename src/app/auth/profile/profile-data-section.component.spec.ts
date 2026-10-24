import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { ProfileResponse } from '../model/auth';
import { ToastService } from '../ui/toast.service';
import { ProfileDataSectionComponent } from './profile-data-section.component';

const profile: ProfileResponse = { id: '1', email: 'maria@cinesync.com', name: 'Maria Garcia', phone: '+573001234567', address: 'Calle 1 #2-3', roles: ['CLIENT'] };
const oldAccount: ProfileResponse = { ...profile, phone: null, address: null };

const rejected = (status: number, fields: string[] = []): ApiError => ({
  status, code: 'VALIDATION_ERROR', message: 'English', traceId: 't', userMessage: 'English',
  details: fields.map(field => ({ field, message: 'English detail' })),
});

describe('ProfileDataSectionComponent', () => {
  const api = { getMyProfile: jasmine.createSpy('getMyProfile'), updateMyProfile: jasmine.createSpy('updateMyProfile') };
  let toasts: jasmine.Spy;

  beforeEach(() => {
    api.getMyProfile.calls.reset();
    api.updateMyProfile.calls.reset();
    api.getMyProfile.and.returnValue(of(profile));
    TestBed.configureTestingModule({ providers: [{ provide: AuthApiService, useValue: api }] });
    toasts = spyOn(TestBed.inject(ToastService), 'show');
  });

  function create() {
    const fixture = TestBed.createComponent(ProfileDataSectionComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const input = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
    const type = (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
    };
    const submit = () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    return { fixture, root, input, type, submit };
  }

  it('loads the profile and shows name, phone and address in labelled fields and the email as read-only text', () => {
    const { root, input } = create();
    expect(api.getMyProfile).toHaveBeenCalledTimes(1);
    expect(root.querySelector('h2')!.textContent).toContain('Datos personales');
    expect(input('profile-name').value).toBe('Maria Garcia');
    expect(input('profile-phone').value).toBe('+573001234567');
    expect(input('profile-address').value).toBe('Calle 1 #2-3');
    for (const id of ['profile-name', 'profile-phone', 'profile-address']) {
      expect(root.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
    expect(root.textContent).toContain('maria@cinesync.com');
    expect(root.querySelector('input[type="email"]')).toBeNull();
  });

  it('shows empty phone and address for an account created before they existed', () => {
    api.getMyProfile.and.returnValue(of(oldAccount));
    const { input } = create();
    expect(input('profile-phone').value).toBe('');
    expect(input('profile-address').value).toBe('');
  });

  it('says it is loading', () => {
    api.getMyProfile.and.returnValue(new Observable<ProfileResponse>());
    const { root } = create();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Cargando');
    expect(root.querySelector('form')).toBeNull();
  });

  it('says it could not load and offers to retry', () => {
    api.getMyProfile.and.returnValue(throwError(() => rejected(500)));
    const { fixture, root } = create();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('no está disponible');
    expect(root.querySelector('form')).toBeNull();
    api.getMyProfile.and.returnValue(of(profile));
    root.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(root.querySelector('form')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('sends only what changed, trimmed, then shows the saved values and a confirmation', () => {
    const { fixture, root, input, type, submit } = create();
    api.updateMyProfile.and.returnValue(of({ ...profile, name: 'Maria G. Lopez' }));
    type('profile-name', '  Maria G. Lopez ');
    submit();
    expect(api.updateMyProfile).toHaveBeenCalledOnceWith({ name: 'Maria G. Lopez' });
    expect(toasts).toHaveBeenCalledWith('Tus datos se actualizaron.', 'success');
    fixture.detectChanges();
    expect(input('profile-name').value).toBe('Maria G. Lopez');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('sets a phone and an address on an old account', () => {
    api.getMyProfile.and.returnValue(of(oldAccount));
    const { type, submit } = create();
    api.updateMyProfile.and.returnValue(of(profile));
    type('profile-phone', '3001234567');
    type('profile-address', 'Calle 9');
    submit();
    expect(api.updateMyProfile).toHaveBeenCalledOnceWith({ phone: '3001234567', address: 'Calle 9' });
  });

  it('does not call the API when nothing changed', () => {
    const { root, submit } = create();
    submit();
    expect(api.updateMyProfile).not.toHaveBeenCalled();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('No hay cambios');
  });

  it('applies the registration rules before calling the API and links each message to its field', () => {
    const { root, input, type, submit } = create();
    type('profile-name', '   ');
    type('profile-phone', '12ab');
    type('profile-address', 'x'.repeat(256));
    submit();
    expect(api.updateMyProfile).not.toHaveBeenCalled();
    expect(root.querySelectorAll('.field-error').length).toBe(3);
    expect(input('profile-phone').getAttribute('aria-describedby')).toBe('profile-phone-error');
    expect(input('profile-name').getAttribute('aria-describedby')).toBe('profile-name-error');
    type('profile-name', 'x'.repeat(101));
    submit();
    expect(root.querySelector('#profile-name-error')).not.toBeNull();
    expect(api.updateMyProfile).not.toHaveBeenCalled();
  });

  it('does not let a phone that exists be emptied', () => {
    const { root, type, submit } = create();
    type('profile-phone', '');
    submit();
    expect(api.updateMyProfile).not.toHaveBeenCalled();
    expect(root.querySelector('#profile-phone-error')).not.toBeNull();
  });

  it('marks the fields the API rejects and keeps what was typed', () => {
    const { root, input, type, submit } = create();
    api.updateMyProfile.and.returnValue(throwError(() => rejected(400, ['phone'])));
    type('profile-phone', '3009999999');
    submit();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('Revisa los campos marcados');
    expect(root.querySelector('#profile-phone-error')).not.toBeNull();
    expect(input('profile-phone').value).toBe('3009999999');
    expect(toasts).not.toHaveBeenCalled();
  });

  it('shows the Spanish message of a failed save and ignores a second submit while it is in flight', () => {
    const { root, type, submit } = create();
    api.updateMyProfile.and.returnValue(throwError(() => rejected(500)));
    type('profile-name', 'Otro Nombre');
    submit();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('no está disponible');
    api.updateMyProfile.calls.reset();
    api.updateMyProfile.and.returnValue(new Observable<ProfileResponse>());
    submit();
    submit();
    expect(api.updateMyProfile).toHaveBeenCalledTimes(1);
  });
});
