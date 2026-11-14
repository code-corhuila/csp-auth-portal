import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserSummary } from '../../model/user';
import { UserPage } from '../model/user-page';
import { UsersAdminApiService } from './users-admin-api.service';

const maria: UserSummary = { id: '3f2a9c1e-5b7d-4e08-9a41-6c2d8e0f1a23', email: 'maria@cinesync.com', name: 'Maria Garcia', roles: ['CLIENT'] };

describe('UsersAdminApiService', () => {
  let service: UsersAdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UsersAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists a page of users with the email prefix', () => {
    const page: UserPage = { data: [maria], meta: { page: 2, limit: 10, total: 11, totalPages: 2 } };
    let received: UserPage | undefined;
    service.list({ email: 'mar', page: 2, limit: 10 }).subscribe(r => (received = r));
    const request = http.expectOne(r => r.url === '/api/v1/auth/users');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('email')).toBe('mar');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush(page);
    expect(received).toEqual(page);
  });

  it('omits the email parameter when there is no search', () => {
    service.list({ page: 1, limit: 10 }).subscribe();
    const request = http.expectOne(r => r.url === '/api/v1/auth/users');
    expect(request.request.params.has('email')).toBeFalse();
    request.flush({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  });

  it('patches the ADMIN role with a fresh Idempotency-Key per call', () => {
    service.setAdmin(maria.id, true).subscribe();
    service.setAdmin(maria.id, false).subscribe();
    const [grant, revoke] = http.match(`/api/v1/auth/users/${maria.id}/role`);
    expect(grant.request.method).toBe('PATCH');
    expect(grant.request.body).toEqual({ role: 'ADMIN', enabled: true });
    expect(revoke.request.body).toEqual({ role: 'ADMIN', enabled: false });
    expect(grant.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(grant.request.headers.get('Idempotency-Key')).not.toBe(revoke.request.headers.get('Idempotency-Key'));
    grant.flush(maria);
    revoke.flush(maria);
  });

  it('encodes the user id in the path', () => {
    service.setAdmin('a/b', true).subscribe();
    http.expectOne('/api/v1/auth/users/a%2Fb/role').flush(maria);
  });
});
