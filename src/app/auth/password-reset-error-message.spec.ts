import { ApiError } from '../shell-contract';
import { passwordResetErrorMessage } from './password-reset-error-message';

function error(status: number, code = 'X'): ApiError {
  return { status, code, message: 'server text', details: [], traceId: 't', userMessage: 'shell text' };
}

describe('passwordResetErrorMessage', () => {
  it('tells the two kinds of 400 apart by step', () => {
    expect(passwordResetErrorMessage(error(400), 'request')).toContain('correo');
    expect(passwordResetErrorMessage(error(400), 'reset')).toContain('8 a 72 caracteres');
  });

  it('says the recovery is unavailable on 404', () => {
    expect(passwordResetErrorMessage(error(404), 'reset')).toContain('no está disponible');
  });

  it('asks to retry on 429 without mentioning an account', () => {
    expect(passwordResetErrorMessage(error(429, 'RATE_LIMITED'), 'request')).toBe('El servicio está ocupado. Inténtalo de nuevo en unos segundos.');
  });

  it('separates a timeout from a lost connection', () => {
    expect(passwordResetErrorMessage(error(0, 'TIMEOUT'), 'reset')).toContain('tardó demasiado');
    expect(passwordResetErrorMessage(error(0, 'NETWORK'), 'reset')).toContain('conectar');
  });

  it('never shows the text of the server', () => {
    expect(passwordResetErrorMessage(error(500), 'reset')).not.toContain('server text');
    expect(passwordResetErrorMessage(error(500), 'reset')).toContain('no está disponible');
  });
});
