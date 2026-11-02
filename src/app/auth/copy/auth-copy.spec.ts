import { COMMON_COPY, LOGIN_COPY, REGISTER_COPY, SESSION_COPY } from './auth-copy';

describe('auth copy', () => {
  const texts = (copy: Record<string, string>): string[] => Object.values(copy);

  it('has no empty text', () => {
    for (const copy of [COMMON_COPY, LOGIN_COPY, REGISTER_COPY, SESSION_COPY]) {
      for (const text of texts(copy)) {
        expect(text.trim()).not.toBe('');
      }
    }
  });

  it('keeps the shared wording identical on login and registration', () => {
    for (const key of Object.keys(COMMON_COPY) as (keyof typeof COMMON_COPY)[]) {
      expect(LOGIN_COPY[key]).toBe(COMMON_COPY[key]);
      expect(REGISTER_COPY[key]).toBe(COMMON_COPY[key]);
    }
  });

  it('tells a session that expired to sign in again', () => {
    expect(SESSION_COPY.expired).toContain('Inicia sesión de nuevo');
  });
});
