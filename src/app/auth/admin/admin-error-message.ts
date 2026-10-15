import { ApiError } from '../../shell-contract';

const CONFLICTS: Record<string, string> = {
  LAST_ADMIN: 'Debe quedar al menos un administrador.',
  USER_WITHOUT_ROLES: 'Este usuario debe conservar al menos un rol.',
};

const BY_STATUS: Record<number, string> = {
  400: 'Algunos datos no son válidos. Revísalos e inténtalo de nuevo.',
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'El usuario no existe o fue eliminado.',
  429: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
};

/** What a person reads when the user administration fails: decided here, in Spanish, never taken from the server's text. */
export function adminErrorMessage(error: ApiError): string {
  if (error.status === 0) {
    return error.code === 'TIMEOUT'
      ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (error.status === 409) {
    return CONFLICTS[error.code] ?? 'La acción choca con el estado actual. Actualiza la lista e inténtalo de nuevo.';
  }
  return BY_STATUS[error.status] ?? 'El servicio no está disponible en este momento. Inténtalo más tarde.';
}
