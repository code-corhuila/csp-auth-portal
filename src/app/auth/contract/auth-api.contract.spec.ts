import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import requirements from '../../../contract/auth-service.requirements.json';
import { UsersAdminApiService } from '../admin/data/users-admin-api.service';
import { AuthApiService } from '../data/auth-api.service';

const BASE = '/api/v1/auth';

interface Requirement {
  operationId: string;
  method: string;
  path: string;
  requiredHeaders: string[];
}

/**
 * The portal calls the auth API through the shell's HttpClient, so these specs do not exercise a server: they make every call
 * the portal does and check what the CONTRACT requires of the request (src/contract/auth-service.requirements.json, kept equal
 * to auth-service.yaml by scripts/check-contract.mjs in CI). A required header that is not sent is a 400 of the real API.
 */
describe('auth API requests against the contract requirements', () => {
  let api: AuthApiService;
  let admin: UsersAdminApiService;
  let http: HttpTestingController;

  const callers: Record<string, () => void> = {
    register: () =>
      api.register({ email: 'a@cinesync.com', password: 'SecurePass123!', name: 'A B', phone: '3001234567', address: 'Calle 1' }).subscribe(),
    login: () => api.login({ email: 'a@cinesync.com', password: 'SecurePass123!' }).subscribe({ error: () => undefined }),
    refreshToken: () => api.refresh({ refreshToken: 'refresh' }).subscribe(),
    logout: () => api.logout({ refreshToken: 'refresh' }).subscribe(),
    requestPasswordReset: () => api.requestPasswordReset({ email: 'a@cinesync.com' }).subscribe(),
    resetPassword: () => api.resetPassword({ token: '0b8f3c1e-5a7d-4e2b-9c64-1d2e3f4a5b6c', password: 'SecurePass123!' }).subscribe(),
    requestEmailChange: () => api.requestEmailChange({ email: 'b@cinesync.com' }).subscribe(),
    verifyEmailChange: () => api.verifyEmailChange({ verificationCode: '004217' }).subscribe(),
    listUsers: () => admin.list({ page: 1, limit: 20, email: '' }).subscribe(),
    updateUserRole: () => admin.setAdmin('user-1', true).subscribe(),
    getMyProfile: () => api.getMyProfile().subscribe(),
    updateMyProfile: () => api.updateMyProfile({ name: 'A B' }).subscribe(),
    changeMyPassword: () => api.changeMyPassword({ currentPassword: 'OldPass123', newPassword: 'NewPass456' }).subscribe(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AuthApiService);
    admin = TestBed.inject(UsersAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectCall(requirement: Requirement): TestRequest {
    const path = requirement.path.replace('{userId}', 'user-1');
    return http.expectOne(req => req.method === requirement.method && req.url === `${BASE}${path}`);
  }

  for (const requirement of requirements.operations as Requirement[]) {
    it(`${requirement.method} ${requirement.path} (${requirement.operationId}) sends what the contract requires`, () => {
      const caller = callers[requirement.operationId];
      expect(caller).withContext(`no caller registered for ${requirement.operationId}`).toBeDefined();
      caller();
      const call = expectCall(requirement);
      for (const header of requirement.requiredHeaders) {
        const value = call.request.headers.get(header) ?? '';
        expect(value.length).withContext(`${header} on ${requirement.operationId}`).toBeGreaterThanOrEqual(8);
        expect(value.length).withContext(`${header} on ${requirement.operationId}`).toBeLessThanOrEqual(128);
      }
      call.flush(null);
    });
  }

  it('has a caller for every operation of the table', () => {
    const missing = (requirements.operations as Requirement[]).filter(op => !callers[op.operationId]).map(op => op.operationId);
    expect(missing).toEqual([]);
  });
});
