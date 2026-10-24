import { AbstractControl, ValidationErrors } from '@angular/forms';

const MIN_BYTES = 8;
const MAX_BYTES = 72;

/** The rules of the auth API for a new password (ADR-050, same as the registration): 8 to 72 bytes in UTF-8, one uppercase letter and one digit. */
export function meetsPasswordRules(password: string): boolean {
  const bytes = new TextEncoder().encode(password).length;
  return bytes >= MIN_BYTES && bytes <= MAX_BYTES && /\p{Lu}/u.test(password) && /\d/.test(password);
}

export function passwordRules(control: AbstractControl<string>): ValidationErrors | null {
  return meetsPasswordRules(control.value) ? null : { passwordRules: true };
}
