import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ApiError } from '../../../shell-contract';
import { UserSummary } from '../../model/user';
import { UsersAdminApiService } from '../data/users-admin-api.service';
import { UserPage, UserQuery } from '../model/user-page';
import { AdminUsersPageComponent } from './admin-users-page.component';

const maria: UserSummary = { id: 'u1', email: 'maria.garcia@cinesync.com', name: 'Maria Garcia', roles: ['CLIENT'] };
const lopez: UserSummary = { id: 'u2', email: 'maria.lopez@cinesync.com', roles: ['CLIENT', 'ADMIN'] };
const root: UserSummary = { id: 'u3', email: 'root@cinesync.com', name: 'Root', roles: ['CLIENT', 'ADMIN'] };

const page = (data: UserSummary[], meta: Partial<UserPage['meta']> = {}): UserPage => ({
  data,
  meta: { page: 1, limit: 10, total: data.length, totalPages: 1, ...meta },
});

const apiError = (status: number, code: string, userMessage: string): ApiError =>
  ({ status, code, message: userMessage, details: [], traceId: 't', userMessage });

describe('AdminUsersPageComponent', () => {
  let lists: { query: UserQuery; reply: Subject<UserPage> }[];
  let fixture: ReturnType<typeof create>;

  function create() {
    lists = [];
    const api = {
      list: (query: UserQuery) => {
        const reply = new Subject<UserPage>();
        lists.push({ query, reply });
        return reply;
      },
    };
    TestBed.configureTestingModule({ providers: [{ provide: UsersAdminApiService, useValue: api }] });
    const created = TestBed.createComponent(AdminUsersPageComponent);
    created.detectChanges();
    return created;
  }

  const el = (): HTMLElement => fixture.nativeElement;
  const text = (selector: string): string => el().querySelector(selector)?.textContent ?? '';
  const click = (selector: string) => {
    el().querySelector<HTMLElement>(selector)!.click();
    fixture.detectChanges();
  };
  const latest = () => lists[lists.length - 1];
  const settle = (data: UserSummary[], meta: Partial<UserPage['meta']> = {}) => {
    latest().reply.next(page(data, meta));
    fixture.detectChanges();
  };
  const search = (value: string) => {
    const input = el().querySelector<HTMLInputElement>('#user-search')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = create();
  });

  it('shows a skeleton and disables the search while it loads', () => {
    expect(el().querySelectorAll('.skeleton').length).toBe(5);
    expect(text('.summary')).toContain('Loading users');
    expect(el().querySelector<HTMLButtonElement>('form button')!.disabled).toBeTrue();
    expect(latest().query).toEqual({ email: undefined, page: 1, limit: 10 });
  });

  it('lists the users with their roles as badges', () => {
    settle([maria, lopez, root], { total: 3 });
    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('maria.garcia@cinesync.com');
    expect(rows[0].querySelectorAll('.badge-client').length).toBe(1);
    expect(rows[1].querySelectorAll('.badge-admin').length).toBe(1);
    expect(rows[1].textContent).toContain('—');
    expect(text('.summary')).toContain('3 users found');
  });

  it('uses the singular for a single user', () => {
    settle([maria], { total: 1 });
    expect(text('.summary')).toContain('1 user found');
  });

  it('searches by email prefix from the first page', () => {
    settle([maria], { page: 2, totalPages: 3 });
    search('  Maria ');
    expect(latest().query).toEqual({ email: 'Maria', page: 1, limit: 10 });
  });

  it('says no user starts with the search and offers to clear it', () => {
    search('xyz');
    settle([], { total: 0, totalPages: 0 });
    expect(text('.state')).toContain("No users start with 'xyz'.");
    click('.state button');
    expect(latest().query.email).toBeUndefined();
    expect(el().querySelector<HTMLInputElement>('#user-search')!.value).toBe('');
  });

  it('says there are no users when the directory is empty', () => {
    settle([], { total: 0, totalPages: 0 });
    expect(text('.state')).toContain('There are no users yet.');
    expect(el().querySelector('.state button')).toBeNull();
  });

  it('shows the failure as an alert and retries the same request', () => {
    latest().reply.error(apiError(503, 'HTTP_503', 'The service is not available right now.'));
    fixture.detectChanges();
    expect(text('[role="alert"]')).toContain('The service is not available right now.');
    expect(text('.summary')).toBe('');
    click('.state-error button');
    expect(lists.length).toBe(2);
    expect(text('.summary')).toContain('Loading users');
  });

  it('pages forwards and backwards and disables the edges', () => {
    settle([maria], { page: 1, totalPages: 2, total: 11 });
    expect(text('nav')).toContain('Page 1 of 2');
    expect(el().querySelectorAll<HTMLButtonElement>('nav button')[0].disabled).toBeTrue();
    click('nav button:last-child');
    expect(latest().query.page).toBe(2);
    settle([lopez], { page: 2, totalPages: 2, total: 11 });
    expect(el().querySelectorAll<HTMLButtonElement>('nav button')[1].disabled).toBeTrue();
    click('nav button:first-child');
    expect(latest().query.page).toBe(1);
  });

  it('cancels a pending request when a new one starts', () => {
    const first = latest();
    search('ma');
    expect(first.reply.observed).toBeFalse();
  });

  it('cancels the request when the page is destroyed', () => {
    const pendingRequest = latest();
    fixture.destroy();
    expect(pendingRequest.reply.observed).toBeFalse();
  });
});
