import { TestBed } from '@angular/core/testing';
import { AuthApiService } from './auth-api.service';
import { SYNTHETIC_USERS } from './synthetic-users';

describe('AuthApiService (Cut 2, synthetic data)', () => {
  let service: AuthApiService;
  const client = SYNTHETIC_USERS[0];
  const admin = SYNTHETIC_USERS[1];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthApiService);
  });

  it('signs in a seeded user and returns the user summary without the password', done => {
    service.login({ email: client.email, password: client.password }).subscribe(response => {
      expect(response.user.id).toBe(client.id);
      expect(response.user.roles).toEqual(['CLIENT']);
      expect(response.expiresIn).toBeGreaterThan(0);
      expect(JSON.stringify(response)).not.toContain(client.password);
      done();
    });
  });

  it('keeps the ADMIN role of the seeded administrator', done => {
    service.login({ email: admin.email, password: admin.password }).subscribe(response => {
      expect(response.user.roles).toEqual(['CLIENT', 'ADMIN']);
      done();
    });
  });

  it('rejects a wrong password with the shell error shape', done => {
    service.login({ email: client.email, password: 'wrong' }).subscribe({
      error: error => {
        expect(error.status).toBe(401);
        expect(error.code).toBe('INVALID_CREDENTIALS');
        expect(error.userMessage).toBeTruthy();
        done();
      },
    });
  });

  it('rejects an unknown email the same way as a wrong password', done => {
    service.login({ email: 'nobody@cinesync.com', password: client.password }).subscribe({
      error: error => {
        expect(error.code).toBe('INVALID_CREDENTIALS');
        done();
      },
    });
  });

  it('registers a new user with the CLIENT role', done => {
    service.register({ email: 'new@cinesync.com', password: 'SecurePass123!', name: 'New User' }).subscribe(response => {
      expect(response.user.email).toBe('new@cinesync.com');
      expect(response.user.roles).toEqual(['CLIENT']);
      done();
    });
  });

  it('rejects a registration with an email that is already taken', done => {
    service.register({ email: client.email, password: 'SecurePass123!', name: 'Other' }).subscribe({
      error: error => {
        expect(error.status).toBe(409);
        expect(error.code).toBe('EMAIL_ALREADY_REGISTERED');
        done();
      },
    });
  });

  it('answers a password reset request without revealing whether the account exists', done => {
    service.requestPasswordReset({ email: 'nobody@cinesync.com' }).subscribe(result => {
      expect(result).toBeUndefined();
      done();
    });
  });
});
