import { ApiError } from '../shell-contract';
import { confirmRegistrationOutcome } from './registration-error-message';

function apiError(status: number, code = 'X'): ApiError {
  return { status, code, message: 'server text', details: [], traceId: 't', userMessage: 'shell text' };
}

describe('confirmRegistrationOutcome', () => {
  it('treats an unknown, expired, used or superseded token as one rejected link', () => {
    expect(confirmRegistrationOutcome(apiError(401, 'INVALID_TOKEN'))).toEqual({ state: 'rejected', message: '' });
    expect(confirmRegistrationOutcome(apiError(400, 'VALIDATION_ERROR'))).toEqual({ state: 'rejected', message: '' });
  });

  it('tells apart an email that got an account meanwhile', () => {
    expect(confirmRegistrationOutcome(apiError(409, 'EMAIL_ALREADY_REGISTERED')).state).toBe('registered');
  });

  it('does not take another 409 for an account', () => {
    expect(confirmRegistrationOutcome(apiError(409, 'IDEMPOTENCY_KEY_CONFLICT')).state).toBe('failed');
  });

  it('words a lost connection and a timeout apart', () => {
    expect(confirmRegistrationOutcome(apiError(0, 'NETWORK')).message).toContain('No se pudo conectar con el servidor');
    expect(confirmRegistrationOutcome(apiError(0, 'TIMEOUT')).message).toContain('tardó demasiado');
  });

  it('words a busy service and any other failure in Spanish, never with the text of the server', () => {
    expect(confirmRegistrationOutcome(apiError(429, 'TOO_MANY_REQUESTS')).message).toContain('ocupado');
    for (const status of [500, 502, 503]) {
      const outcome = confirmRegistrationOutcome(apiError(status));
      expect(outcome.state).toBe('failed');
      expect(outcome.message).toContain('El servicio no está disponible');
      expect(outcome.message).not.toContain('server text');
    }
  });
});
