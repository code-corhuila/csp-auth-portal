import { TestBed } from '@angular/core/testing';
import { AuthResponse } from '../model/auth';
import { AuthSessionService } from './session-store';

const response: AuthResponse = {
  accessToken: 'token',
  refreshToken: 'refresh',
  expiresIn: 3600,
  user: { id: '1', email: 'admin@cinesync.com', roles: ['CLIENT', 'ADMIN'] },
};

describe('AuthSessionService', () => {
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    session = TestBed.inject(AuthSessionService);
  });

  it('starts without a session', () => {
    expect(session.isAuthenticated()).toBeFalse();
    expect(session.user()).toBeNull();
  });

  it('starts a session from an auth response', () => {
    session.start(response);
    expect(session.isAuthenticated()).toBeTrue();
    expect(session.user()?.email).toBe('admin@cinesync.com');
  });

  it('answers role questions from the seeded roles', () => {
    session.start(response);
    expect(session.hasRole('ADMIN')).toBeTrue();
    session.end();
    expect(session.hasRole('ADMIN')).toBeFalse();
  });

  it('ends the session', () => {
    session.start(response);
    session.end();
    expect(session.isAuthenticated()).toBeFalse();
  });
});
