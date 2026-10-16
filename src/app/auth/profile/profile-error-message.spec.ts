import { ApiError } from '../../shell-contract';
import { profileErrorMessage } from './profile-error-message';

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
