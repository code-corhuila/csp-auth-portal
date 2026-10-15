import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ApiError } from '../../../shell-contract';
import { UserSummary } from '../../model/user';
import { ToastService } from '../../ui/toast.service';
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
  let patches: { id: string; enabled: boolean; reply: Subject<UserSummary> }[];
  let toasts: jasmine.Spy;
  let fixture: ReturnType<typeof create>;

  function create() {
    lists = [];
    patches = [];
    const api = {
      list: (query: UserQuery) => {
        const reply = new Subject<UserPage>();
        lists.push({ query, reply });
        return reply;
      },
      setAdmin: (id: string, enabled: boolean) => {
        const reply = new Subject<UserSummary>();
        patches.push({ id, enabled, reply });
        return reply;
      },
    };
    TestBed.configureTestingModule({ providers: [{ provide: UsersAdminApiService, useValue: api }] });
    toasts = spyOn(TestBed.inject(ToastService), 'show');
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
  const rowButton = (index: number) => el().querySelectorAll<HTMLButtonElement>('tbody .btn')[index];
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

  it('lists the users with their roles as badges and the action each one allows', () => {
    settle([maria, lopez, root], { total: 3 });
    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('maria.garcia@cinesync.com');
    expect(rows[0].querySelectorAll('.badge-client').length).toBe(1);
    expect(rows[1].querySelectorAll('.badge-admin').length).toBe(1);
    expect(rows[1].textContent).toContain('—');
    expect(rowButton(0).textContent).toContain('Grant ADMIN');
    expect(rowButton(0).getAttribute('aria-label')).toBe('Grant ADMIN to maria.garcia@cinesync.com');
    expect(rowButton(1).textContent).toContain('Revoke ADMIN');
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

  describe('single administrator', () => {
    it('disables Revoke for the only ADMIN of the whole directory, with the reason', () => {
      settle([maria, root]);
      const revoke = rowButton(1);
      expect(revoke.disabled).toBeTrue();
      expect(revoke.getAttribute('title')).toBe('At least one administrator must remain.');
      expect(rowButton(0).getAttribute('title')).toBeNull();
    });

    it('leaves Revoke to the API when there are two ADMIN, a search or more pages', () => {
      settle([lopez, root]);
      expect(rowButton(0).disabled).toBeFalse();
      search('root');
      settle([root]);
      expect(rowButton(0).disabled).toBeFalse();
      search('');
      settle([root], { totalPages: 2, total: 11 });
      expect(rowButton(0).disabled).toBeFalse();
    });
  });

  describe('changing a role', () => {
    beforeEach(() => settle([maria, lopez, root]));

    it('asks for confirmation naming the user and the moment the role takes effect', () => {
      click('tbody tr:first-child .btn');
      expect(el().querySelector('[role="dialog"]')).not.toBeNull();
      expect(text('#role-change-title')).toBe('Grant ADMIN to maria.garcia@cinesync.com?');
      expect(text('.dialog-text')).toContain('next time they sign in');
      expect(el().querySelector('.auth-close')!.getAttribute('aria-label')).toBe('Close');
    });

    it('grants ADMIN, updates the row, confirms with a success toast and returns the focus', () => {
      const trigger = rowButton(0);
      click('tbody tr:first-child .btn');
      click('.dialog-actions .btn-primary');
      expect(patches[0].id).toBe('u1');
      expect(patches[0].enabled).toBeTrue();
      expect(el().querySelector<HTMLButtonElement>('.dialog-actions .btn-primary')!.disabled).toBeTrue();
      patches[0].reply.next({ ...maria, roles: ['CLIENT', 'ADMIN'] });
      fixture.detectChanges();
      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(toasts).toHaveBeenCalledWith(
        'ADMIN granted to maria.garcia@cinesync.com. It takes effect the next time they sign in or their token is refreshed.',
        'success',
      );
      expect(el().querySelectorAll('tbody tr')[0].querySelectorAll('.badge-admin').length).toBe(1);
      expect(rowButton(0).textContent).toContain('Revoke ADMIN');
      expect(document.activeElement).toBe(trigger);
    });

    it('revokes ADMIN with a danger confirmation', () => {
      click('tbody tr:nth-child(2) .btn');
      expect(text('#role-change-title')).toBe('Revoke ADMIN from maria.lopez@cinesync.com?');
      expect(el().querySelector('.dialog-actions .btn-danger')).not.toBeNull();
      click('.dialog-actions .btn-danger');
      expect(patches[0].enabled).toBeFalse();
      patches[0].reply.next({ ...lopez, roles: ['CLIENT'] });
      fixture.detectChanges();
      expect(toasts.calls.mostRecent().args[0]).toContain('ADMIN revoked from maria.lopez@cinesync.com.');
      expect(rowButton(1).textContent).toContain('Grant ADMIN');
    });

    it('changes nothing when the dialog is cancelled', () => {
      click('tbody tr:first-child .btn');
      click('.dialog-actions .btn-ghost');
      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(patches.length).toBe(0);
    });

    it('does not close the dialog or send twice while saving', () => {
      click('tbody tr:first-child .btn');
      click('.dialog-actions .btn-primary');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      (fixture.componentInstance as unknown as { confirm(): void }).confirm();
      expect(el().querySelector('[role="dialog"]')).not.toBeNull();
      expect(patches.length).toBe(1);
    });

    it('ignores a confirmation when nothing is pending', () => {
      (fixture.componentInstance as unknown as { confirm(): void }).confirm();
      expect(patches.length).toBe(0);
    });

    it('shows the last-administrator conflict as an error toast and reloads the list', () => {
      click('tbody tr:nth-child(2) .btn');
      click('.dialog-actions .btn-danger');
      patches[0].reply.error(apiError(409, 'LAST_ADMIN', 'The last active administrator cannot lose the ADMIN role'));
      fixture.detectChanges();
      expect(toasts).toHaveBeenCalledWith('At least one administrator must remain.', 'error');
      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(lists.length).toBe(2);
    });

    it('shows any other failure as an error toast and leaves the row as it was', () => {
      click('tbody tr:first-child .btn');
      click('.dialog-actions .btn-primary');
      patches[0].reply.error(apiError(403, 'FORBIDDEN', 'You are not allowed to do this.'));
      fixture.detectChanges();
      expect(toasts).toHaveBeenCalledWith('You are not allowed to do this.', 'error');
      expect(rowButton(0).textContent).toContain('Grant ADMIN');
      expect(lists.length).toBe(1);
    });
  });
});
