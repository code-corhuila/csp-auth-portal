import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { asApiError } from '../../shell-contract';
import { AuthApiService } from '../data/auth-api.service';
import { ProfileResponse, UpdateProfileRequest } from '../model/auth';
import { ToastService } from '../ui/toast.service';
import { ProfileField, profileDataFailure } from './profile-error-message';

const PHONE = /^\+?[0-9]{7,15}$/;
const NAME_MAX = 100;
const ADDRESS_MAX = 255;

const FIELD_ERRORS: Record<ProfileField, string> = {
  name: 'Ingresa tu nombre (hasta 100 caracteres).',
  phone: 'Solo dígitos, con + opcional al inicio (7 a 15).',
  address: 'Ingresa tu dirección (hasta 255 caracteres).',
};

const filled = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim() === '' ? { required: true } : null;

const maxTrimmed = (max: number) => (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim().length > max ? { maxlength: true } : null;

const phoneFormat = (control: AbstractControl<string>): ValidationErrors | null => {
  const phone = control.value.trim();
  return phone === '' || PHONE.test(phone) ? null : { pattern: true };
};

/**
 * "Datos personales" of Mi perfil (HU-AUTH-007, ADR-051): loads the profile with GET /me and edits name, phone and address with
 * PATCH /me, sending only what changed. The email is shown, not edited: it keeps its verified flow in the next section. Phone and
 * address are null for an account created before they existed; once set they cannot be cleared, so the form asks for them again.
 */
@Component({
  selector: 'app-profile-data-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  styleUrl: '../pages/auth-form.css',
  styles: `
    :host { display: block; margin-top: 28px; }
    .auth-switch button { background: none; border: none; padding: 0; color: var(--color-brand-secondary); font: inherit; font-weight: 700; cursor: pointer; }
  `,
  template: `
    <section aria-labelledby="profile-data-title">
      <h2 id="profile-data-title">Datos personales</h2>
      @if (profile() === null) {
        @if (loadFailure(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
          <p class="auth-switch"><button type="button" (click)="load()">Reintentar</button></p>
        } @else {
          <p class="form-status" role="status">Cargando tus datos…</p>
        }
      } @else {
        <p>Correo: <strong>{{ profile()?.email }}</strong> (se cambia en la sección Correo electrónico)</p>
        <form class="auth-form" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-group">
            <label for="profile-name">Nombre</label>
            <input id="profile-name" class="form-input" type="text" autocomplete="name" formControlName="name"
                   [attr.aria-describedby]="describedBy('name')" />
            @if (showError('name')) {
              <span id="profile-name-error" class="field-error">{{ fieldErrors.name }}</span>
            }
          </div>
          <div class="form-group">
            <label for="profile-phone">Teléfono</label>
            <input id="profile-phone" class="form-input" type="tel" autocomplete="tel" placeholder="Ej. 3001234567" formControlName="phone"
                   [attr.aria-describedby]="describedBy('phone')" />
            @if (showError('phone')) {
              <span id="profile-phone-error" class="field-error">{{ fieldErrors.phone }}</span>
            }
          </div>
          <div class="form-group">
            <label for="profile-address">Dirección</label>
            <input id="profile-address" class="form-input" type="text" autocomplete="street-address" placeholder="Ej. Calle 123 #45-67"
                   formControlName="address" [attr.aria-describedby]="describedBy('address')" />
            @if (showError('address')) {
              <span id="profile-address-error" class="field-error">{{ fieldErrors.address }}</span>
            }
          </div>
          @if (notice(); as message) {
            <p class="form-status" role="status">{{ message }}</p>
          }
          @if (failure(); as message) {
            <p id="profile-data-failure" class="form-error" role="alert">{{ message }}</p>
          }
          <button class="btn-primary" type="submit" [disabled]="pending()">Guardar datos</button>
        </form>
      }
    </section>
  `,
})
export class ProfileDataSectionComponent implements OnInit {
  private readonly api = inject(AuthApiService);
  private readonly toasts = inject(ToastService);
  private readonly submitted = signal(false);
  private readonly rejected = signal<ProfileField[]>([]);

  protected readonly fieldErrors = FIELD_ERRORS;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [filled, maxTrimmed(NAME_MAX)]],
    phone: ['', [phoneFormat]],
    address: ['', [maxTrimmed(ADDRESS_MAX)]],
  });
  protected readonly profile = signal<ProfileResponse | null>(null);
  protected readonly loadFailure = signal<string | null>(null);
  protected readonly pending = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loadFailure.set(null);
    this.api.getMyProfile().subscribe({
      next: profile => this.show(profile),
      error: err => this.loadFailure.set(profileDataFailure(asApiError(err)).message),
    });
  }

  protected showError(field: ProfileField): boolean {
    return (this.submitted() && this.form.controls[field].invalid) || this.rejected().includes(field);
  }

  protected describedBy(field: ProfileField): string | null {
    return [this.showError(field) ? `profile-${field}-error` : null, this.failure() ? 'profile-data-failure' : null].filter(Boolean).join(' ') || null;
  }

  protected save(): void {
    this.submitted.set(true);
    const current = this.profile();
    if (current === null || this.form.invalid || this.pending()) {
      return;
    }
    const changes = this.changesFrom(current);
    this.failure.set(null);
    this.rejected.set([]);
    if (Object.keys(changes).length === 0) {
      this.notice.set('No hay cambios para guardar.');
      return;
    }
    this.notice.set(null);
    this.pending.set(true);
    this.api.updateMyProfile(changes).subscribe({
      next: updated => {
        this.show(updated);
        this.toasts.show('Tus datos se actualizaron.', 'success');
      },
      error: err => {
        const failure = profileDataFailure(asApiError(err));
        this.rejected.set(failure.fields);
        this.failure.set(failure.message);
        this.pending.set(false);
      },
    });
  }

  private changesFrom(current: ProfileResponse): UpdateProfileRequest {
    const { name, phone, address } = this.form.getRawValue();
    const changes: UpdateProfileRequest = {};
    if (name.trim() !== current.name) {
      changes.name = name.trim();
    }
    if (phone.trim() !== (current.phone ?? '')) {
      changes.phone = phone.trim();
    }
    if (address.trim() !== (current.address ?? '')) {
      changes.address = address.trim();
    }
    return changes;
  }

  /** Shows the saved values; a phone or an address that exists can no longer be emptied. */
  private show(profile: ProfileResponse): void {
    this.profile.set(profile);
    this.form.controls.phone.setValidators(profile.phone === null ? [phoneFormat] : [filled, phoneFormat]);
    this.form.controls.address.setValidators(profile.address === null ? [maxTrimmed(ADDRESS_MAX)] : [filled, maxTrimmed(ADDRESS_MAX)]);
    this.form.reset({ name: profile.name, phone: profile.phone ?? '', address: profile.address ?? '' });
    this.submitted.set(false);
    this.pending.set(false);
  }
}
