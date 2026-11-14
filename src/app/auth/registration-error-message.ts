import { ApiError } from '../shell-contract';

export interface ConfirmRegistrationOutcome {
  state: 'rejected' | 'registered' | 'failed';
  /** What a person reads for a `failed` outcome; empty for the other two, which the page words itself. */
  message: string;
}

/**
 * What the confirmation of a registration means for the person: decided here, in Spanish, never taken from the server's text.
 * An unknown, expired, used or superseded token is one outcome (401 INVALID_TOKEN); an email that got an account meanwhile
 * (409 EMAIL_ALREADY_REGISTERED) is another; anything else is a failure with a message.
 */
export function confirmRegistrationOutcome(error: ApiError): ConfirmRegistrationOutcome {
  if (error.status === 401 || error.status === 400) {
    return { state: 'rejected', message: '' };
  }
  if (error.status === 409 && error.code === 'EMAIL_ALREADY_REGISTERED') {
    return { state: 'registered', message: '' };
  }
  if (error.status === 0) {
    return {
      state: 'failed',
      message: error.code === 'TIMEOUT'
        ? 'El servidor tardó demasiado en responder. Abre el enlace de nuevo.'
        : 'No se pudo conectar con el servidor. Revisa tu conexión y abre el enlace de nuevo.',
    };
  }
  if (error.status === 429) {
    return { state: 'failed', message: 'El servicio está ocupado. Abre el enlace de nuevo en unos segundos.' };
  }
  return { state: 'failed', message: 'El servicio no está disponible en este momento. Abre el enlace de nuevo más tarde.' };
}
