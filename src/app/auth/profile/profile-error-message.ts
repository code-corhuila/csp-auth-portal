import { ApiError } from '../../shell-contract';
import { SAME_PASSWORD_MESSAGE } from '../password-rules';

export type EmailChangeStep = 'request' | 'verify';

const BY_STATUS: Record<number, string> = {
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  409: 'Ese correo ya está en uso.',
  429: 'Demasiados intentos. Inténtalo más tarde.',
};

const INVALID_BY_STEP: Record<EmailChangeStep, string> = {
  request: 'Ingresa un correo electrónico válido.',
  // The API answers the same 400 for a wrong, expired, exhausted or missing code: this text does not claim which.
  verify: 'El código no es válido o ya venció. Solicita un código nuevo.',
};

/** What a person reads when the email change fails: decided here, in Spanish, never taken from the server's text. */
export function profileErrorMessage(error: ApiError, step: EmailChangeStep): string {
  if (error.status === 0) {
    return error.code === 'TIMEOUT'
      ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (error.status === 400) {
    return INVALID_BY_STEP[step];
  }
  return BY_STATUS[error.status] ?? 'El servicio no está disponible en este momento. Inténtalo más tarde.';
}

const SESSION_EXPIRED = 'Tu sesión expiró. Inicia sesión de nuevo.';
const REVIEW_DATA = 'Revisa los datos ingresados.';

function transportOrServerMessage(error: ApiError): string {
  if (error.status === 0) {
    return error.code === 'TIMEOUT'
      ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'El servicio no está disponible en este momento. Inténtalo más tarde.';
}

export type ProfileField = 'name' | 'phone' | 'address';
const PROFILE_FIELDS: readonly string[] = ['name', 'phone', 'address'];

export interface ProfileDataFailure {
  /** The fields the API named in `details[].field`; the page shows the Spanish rule of each. */
  fields: ProfileField[];
  message: string;
}

/** What a person reads when saving name, phone or address fails: decided here, never taken from the server's text. */
export function profileDataFailure(error: ApiError): ProfileDataFailure {
  if (error.status === 400) {
    const fields = error.details.map(detail => detail.field).filter((field): field is ProfileField => PROFILE_FIELDS.includes(field));
    return { fields, message: fields.length > 0 ? 'Revisa los campos marcados.' : REVIEW_DATA };
  }
  const message = error.status === 401 ? SESSION_EXPIRED : error.status === 429 ? BY_STATUS[429] : transportOrServerMessage(error);
  return { fields: [], message };
}

export interface PasswordChangeFailure {
  /** The field to mark, or null for a message about the whole form. */
  field: 'currentPassword' | 'newPassword' | null;
  message: string;
}

function waitMessage(retryAfterSeconds: number | undefined): string {
  if (retryAfterSeconds === undefined) {
    return 'Demasiados intentos. Inténtalo de nuevo más tarde.';
  }
  if (retryAfterSeconds < 60) {
    return `Demasiados intentos. Inténtalo de nuevo en ${retryAfterSeconds} ${retryAfterSeconds === 1 ? 'segundo' : 'segundos'}.`;
  }
  return `Demasiados intentos. Inténtalo de nuevo en ${Math.ceil(retryAfterSeconds / 60)} minutos.`;
}

/**
 * What a person reads when the password change fails. A wrong current password is a 400 on `currentPassword` (ADR-051), never a 401,
 * so a 401 here is always an expired session.
 */
export function passwordChangeFailure(error: ApiError): PasswordChangeFailure {
  if (error.status === 400) {
    if (error.details.some(detail => detail.field === 'currentPassword')) {
      return { field: 'currentPassword', message: 'La contraseña actual no es correcta.' };
    }
    const onNewPassword = error.details.filter(detail => detail.field === 'newPassword');
    if (onNewPassword.some(detail => detail.message === SAME_PASSWORD_MESSAGE)) {
      return { field: 'newPassword', message: 'La nueva contraseña debe ser distinta de la actual.' };
    }
    if (onNewPassword.length > 0) {
      return { field: 'newPassword', message: 'La contraseña no cumple las reglas: de 8 a 72 caracteres, una mayúscula y un número.' };
    }
    return { field: null, message: REVIEW_DATA };
  }
  const message = error.status === 401 ? SESSION_EXPIRED : error.status === 429 ? waitMessage(error.retryAfterSeconds) : transportOrServerMessage(error);
  return { field: null, message };
}
