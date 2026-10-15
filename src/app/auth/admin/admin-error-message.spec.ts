import { ApiError } from '../../shell-contract';
import { adminErrorMessage } from './admin-error-message';

const error = (status: number, code = 'X'): ApiError =>
  ({ status, code, message: 'English server text', details: [], traceId: 't', userMessage: 'English shell text' });

describe('adminErrorMessage', () => {
  it('explains the conflicts of the role change', () => {
    expect(adminErrorMessage(error(409, 'LAST_ADMIN'))).toBe('Debe quedar al menos un administrador.');
    expect(adminErrorMessage(error(409, 'USER_WITHOUT_ROLES'))).toBe('Este usuario debe conservar al menos un rol.');
  });

  it('has a generic message for an unknown conflict', () => {
    expect(adminErrorMessage(error(409))).toContain('Actualiza la lista');
  });

  it('explains the network failures', () => {
    expect(adminErrorMessage(error(0, 'NETWORK_ERROR'))).toContain('No se pudo conectar');
    expect(adminErrorMessage(error(0, 'TIMEOUT'))).toContain('tardó demasiado');
  });

  it('maps the statuses of the contract', () => {
    expect(adminErrorMessage(error(400))).toContain('no son válidos');
    expect(adminErrorMessage(error(401))).toContain('sesión expiró');
    expect(adminErrorMessage(error(403))).toBe('No tienes permiso para hacer esto.');
    expect(adminErrorMessage(error(404))).toContain('no existe');
    expect(adminErrorMessage(error(429))).toContain('Demasiadas solicitudes');
  });

  it('falls back to a service-unavailable message and never shows the server text', () => {
    const message = adminErrorMessage(error(500));
    expect(message).toContain('no está disponible');
    expect(message).not.toContain('English');
  });
});
