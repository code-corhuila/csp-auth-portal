import { ApiError } from '../../shell-contract';
import { passwordChangeFailure, profileDataFailure, profileErrorMessage } from './profile-error-message';

const error = (status: number, code = 'X'): ApiError =>
  ({ status, code, message: 'English server text', details: [], traceId: 't', userMessage: 'English shell text' });

describe('profileErrorMessage', () => {
  it('asks for a valid email when the request is rejected with 400', () => {
    expect(profileErrorMessage(error(400), 'request')).toBe('Ingresa un correo electrónico válido.');
  });

  it('gives one generic message for every cause of an invalid code', () => {
    expect(profileErrorMessage(error(400), 'verify')).toBe('El código no es válido o ya venció. Solicita un código nuevo.');
  });

  it('says the email is in use on 409', () => {
    expect(profileErrorMessage(error(409, 'EMAIL_ALREADY_REGISTERED'), 'request')).toBe('Ese correo ya está en uso.');
    expect(profileErrorMessage(error(409, 'EMAIL_ALREADY_REGISTERED'), 'verify')).toBe('Ese correo ya está en uso.');
  });

  it('asks to wait on 429', () => {
    expect(profileErrorMessage(error(429, 'RATE_LIMITED'), 'request')).toBe('Demasiados intentos. Inténtalo más tarde.');
  });

  it('tells the session expired on 401', () => {
    expect(profileErrorMessage(error(401), 'verify')).toBe('Tu sesión expiró. Inicia sesión de nuevo.');
  });

  it('explains the network failures', () => {
    expect(profileErrorMessage(error(0, 'NETWORK_ERROR'), 'request')).toContain('No se pudo conectar');
    expect(profileErrorMessage(error(0, 'TIMEOUT'), 'request')).toContain('tardó demasiado');
  });

  it('has a generic message for anything else and never shows the server text', () => {
    const message = profileErrorMessage(error(500, 'INTERNAL_ERROR'), 'verify');
    expect(message).toContain('no está disponible');
    expect(message).not.toContain('English');
  });
});

const withDetail = (status: number, field: string, message: string, extra: Partial<ApiError> = {}): ApiError =>
  ({ ...error(status, 'VALIDATION_ERROR'), details: [{ field, message }], ...extra });

describe('passwordChangeFailure', () => {
  it('marks the current password field on a wrong current password and never reads it as an expired session', () => {
    expect(passwordChangeFailure(withDetail(400, 'currentPassword', 'The current password is incorrect')))
      .toEqual({ field: 'currentPassword', message: 'La contraseña actual no es correcta.' });
  });

  it('tells a new password equal to the current one apart from a weak one', () => {
    expect(passwordChangeFailure(withDetail(400, 'newPassword', 'The new password must differ from the current one')))
      .toEqual({ field: 'newPassword', message: 'La nueva contraseña debe ser distinta de la actual.' });
    expect(passwordChangeFailure(withDetail(400, 'newPassword', 'Password must be at least 8 characters')))
      .toEqual({ field: 'newPassword', message: 'La contraseña no cumple las reglas: de 8 a 72 caracteres, una mayúscula y un número.' });
  });

  it('does not confuse the text of another field with the same-password detail', () => {
    expect(passwordChangeFailure(withDetail(400, 'currentPassword', 'The new password must differ from the current one')).message)
      .toBe('La contraseña actual no es correcta.');
  });

  it('asks to review the data on a 400 without a known field', () => {
    expect(passwordChangeFailure(error(400))).toEqual({ field: null, message: 'Revisa los datos ingresados.' });
  });

  it('uses the Retry-After of a 429 in seconds or minutes, and a generic text without it', () => {
    expect(passwordChangeFailure(error(429, 'RATE_LIMITED')).message).toBe('Demasiados intentos. Inténtalo de nuevo más tarde.');
    expect(passwordChangeFailure({ ...error(429), retryAfterSeconds: 1 }).message).toBe('Demasiados intentos. Inténtalo de nuevo en 1 segundo.');
    expect(passwordChangeFailure({ ...error(429), retryAfterSeconds: 30 }).message).toBe('Demasiados intentos. Inténtalo de nuevo en 30 segundos.');
    expect(passwordChangeFailure({ ...error(429), retryAfterSeconds: 61 }).message).toBe('Demasiados intentos. Inténtalo de nuevo en 2 minutos.');
    expect(passwordChangeFailure({ ...error(429), retryAfterSeconds: 900 }).message).toBe('Demasiados intentos. Inténtalo de nuevo en 15 minutos.');
  });

  it('maps 401, network failures and server errors', () => {
    expect(passwordChangeFailure(error(401)).message).toBe('Tu sesión expiró. Inicia sesión de nuevo.');
    expect(passwordChangeFailure(error(0, 'TIMEOUT')).message).toContain('tardó demasiado');
    expect(passwordChangeFailure(error(0, 'NETWORK')).message).toContain('No se pudo conectar');
    expect(passwordChangeFailure(error(500)).message).toContain('no está disponible');
  });
});

describe('profileDataFailure', () => {
  it('names the fields the API rejected and ignores the ones it does not know', () => {
    const rejected = { ...error(400, 'VALIDATION_ERROR'), details: [
      { field: 'phone', message: 'x' }, { field: 'name', message: 'y' }, { field: 'email', message: 'z' },
    ] };
    expect(profileDataFailure(rejected)).toEqual({ fields: ['phone', 'name'], message: 'Revisa los campos marcados.' });
  });

  it('asks to review the data on a 400 without a known field', () => {
    expect(profileDataFailure(error(400))).toEqual({ fields: [], message: 'Revisa los datos ingresados.' });
  });

  it('maps 401, 429, network failures and server errors', () => {
    expect(profileDataFailure(error(401)).message).toBe('Tu sesión expiró. Inicia sesión de nuevo.');
    expect(profileDataFailure(error(429)).message).toBe('Demasiados intentos. Inténtalo más tarde.');
    expect(profileDataFailure(error(0, 'TIMEOUT')).message).toContain('tardó demasiado');
    expect(profileDataFailure(error(503)).message).toContain('no está disponible');
  });
});
