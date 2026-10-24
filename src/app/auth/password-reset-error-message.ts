import { ApiError } from '../shell-contract';
import { SAME_PASSWORD_MESSAGE } from './password-rules';

export type PasswordResetStep = 'request' | 'reset';

const SAME_PASSWORD_DETAIL = { field: 'password', message: SAME_PASSWORD_MESSAGE };

const INVALID_BY_STEP: Record<PasswordResetStep, string> = {
  request: 'Ingresa un correo electrónico válido.',
  reset: 'La contraseña no cumple las reglas: de 8 a 72 caracteres, una mayúscula y un número.',
};

/** What a person reads when the password recovery fails: decided here, in Spanish, never taken from the server's text. */
export function passwordResetErrorMessage(error: ApiError, step: PasswordResetStep): string {
  if (error.status === 0) {
    return error.code === 'TIMEOUT'
      ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (error.status === 400) {
    if (step === 'reset' && error.details.some(detail => detail.field === SAME_PASSWORD_DETAIL.field && detail.message === SAME_PASSWORD_DETAIL.message)) {
      return 'La nueva contraseña debe ser distinta de la actual.';
    }
    return INVALID_BY_STEP[step];
  }
  if (error.status === 404) {
    return 'La recuperación de contraseña no está disponible por ahora.';
  }
  if (error.status === 429) {
    return 'El servicio está ocupado. Inténtalo de nuevo en unos segundos.';
  }
  return 'El servicio no está disponible en este momento. Inténtalo más tarde.';
}
