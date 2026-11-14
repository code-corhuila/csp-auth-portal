import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserSummary } from '../../model/user';
import { UserPage, UserQuery } from '../model/user-page';

const BASE = '/api/v1/auth/users';

/**
 * Typed calls to the user administration of csp-auth-api (auth-service 1.5.0, permission `user:role:update`).
 * The injected HttpClient is the SHELL's: its interceptor adds the gateway URL and the Bearer token.
 */
@Injectable({ providedIn: 'root' })
export class UsersAdminApiService {
  private readonly http = inject(HttpClient);

  list(query: UserQuery): Observable<UserPage> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.email) {
      params = params.set('email', query.email);
    }
    return this.http.get<UserPage>(BASE, { params });
  }

  /** Sets whether the user holds ADMIN. Granting a held role or revoking a missing one is a 200 with no change. */
  setAdmin(userId: string, enabled: boolean): Observable<UserSummary> {
    return this.http.patch<UserSummary>(
      `${BASE}/${encodeURIComponent(userId)}/role`,
      { role: 'ADMIN', enabled },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    );
  }
}
