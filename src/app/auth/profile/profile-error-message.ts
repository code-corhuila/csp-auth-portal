import { ApiError } from '../../shell-contract';

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
