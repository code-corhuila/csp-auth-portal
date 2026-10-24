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

export const PASSWORD_RULES_HINT = 'De 8 a 72 caracteres, una mayúscula y un número.';

/** The API tells this 400 apart only by the field and this text (contract auth-service 1.8.0 and 1.9.0): there is no per-detail code. */
export const SAME_PASSWORD_MESSAGE = 'The new password must differ from the current one';
