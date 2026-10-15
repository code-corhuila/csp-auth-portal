import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { asApiError } from '../../../shell-contract';
import { Role, UserSummary } from '../../model/user';
import { AuthModalComponent } from '../../ui/auth-modal.component';
import { ToastService } from '../../ui/toast.service';
import { adminErrorMessage } from '../admin-error-message';
import { UsersAdminApiService } from '../data/users-admin-api.service';
import { UserPage } from '../model/user-page';

const PAGE_SIZE = 10;
const LAST_ADMIN_MESSAGE = 'Debe quedar al menos un administrador.';
const FRESHNESS = 'El cambio se aplica la próxima vez que el usuario inicie sesión o se renueve su token.';
const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Administrador', CLIENT: 'Cliente' };

interface RoleChange {
  user: UserSummary;
  grant: boolean;
}

type Phase = 'loading' | 'ready' | 'failed';

const isAdmin = (user: UserSummary): boolean => user.roles.includes('ADMIN');

/** The ADMIN screen of 12-ux-ui/wireframes.md section 6: find a user by email prefix and grant or revoke ADMIN. */
@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [ReactiveFormsModule, AuthModalComponent],
  styleUrl: './admin-users-page.component.css',
  template: `
    <header class="page-header">
      <h1 class="page-title">Roles de usuarios</h1>
      <p class="page-description">Busca una cuenta por correo y decide quién administra Cinesync.</p>
    </header>

    <form class="search" role="search" (submit)="applySearch($event)">
      <label for="user-search">Buscar por correo electrónico</label>
      <div class="search-row">
        <input id="user-search" class="form-input" type="search" maxlength="254" autocomplete="off"
               placeholder="maria" [formControl]="search" />
        <button class="btn btn-primary" type="submit" [disabled]="phase() === 'loading'">Buscar</button>
      </div>
    </form>

    <p class="summary" role="status">{{ summary() }}</p>

    @switch (phase()) {
      @case ('failed') {
        <div class="state state-error" role="alert">
          <p>{{ failure() }}</p>
          <button class="btn btn-ghost" type="button" (click)="load()">Reintentar</button>
        </div>
      }
      @case ('loading') {
        <div class="skeletons" aria-hidden="true">
          @for (row of skeletonRows; track row) {
            <div class="skeleton"></div>
          }
        </div>
      }
      @case ('ready') {
        @if (result()!.data.length) {
          <div class="table-responsive">
            <table class="data-table">
              <caption class="visually-hidden">Usuarios y sus roles</caption>
              <thead>
                <tr><th scope="col">Correo electrónico</th><th scope="col">Nombre</th><th scope="col">Roles</th><th scope="col">Acciones</th></tr>
              </thead>
              <tbody>
                @for (user of result()!.data; track user.id) {
                  <tr>
                    <td data-label="Correo electrónico" class="cell-email">{{ user.email }}</td>
                    <td data-label="Nombre">{{ user.name || '—' }}</td>
                    <td data-label="Roles">
                      @for (role of user.roles; track role) {
                        <span class="badge badge-{{ role.toLowerCase() }}">{{ roleLabel(role) }}</span>
                      }
                    </td>
                    <td data-label="Acciones">
                      <button #action class="btn" type="button" (click)="ask(user, action)"
                              [class.btn-danger]="isAdmin(user)" [class.btn-primary]="!isAdmin(user)"
                              [disabled]="user.id === soleAdminId()"
                              [attr.title]="user.id === soleAdminId() ? lastAdminMessage : null"
                              [attr.aria-label]="(isAdmin(user) ? 'Quitar el rol de administrador a ' : 'Dar el rol de administrador a ') + user.email">
                        {{ isAdmin(user) ? 'Quitar administrador' : 'Dar administrador' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <nav class="pagination" aria-label="Paginación">
            <button class="btn btn-ghost" type="button" (click)="goTo(result()!.meta.page - 1)" [disabled]="result()!.meta.page <= 1">Anterior</button>
            <span>Página {{ result()!.meta.page }} de {{ result()!.meta.totalPages }}</span>
            <button class="btn btn-ghost" type="button" (click)="goTo(result()!.meta.page + 1)" [disabled]="result()!.meta.page >= result()!.meta.totalPages">Siguiente</button>
          </nav>
        } @else {
          <div class="state">
            @if (applied()) {
              <p>Ningún usuario empieza por '{{ applied() }}'.</p>
              <button class="btn btn-ghost" type="button" (click)="clearSearch()">Limpiar búsqueda</button>
            } @else {
              <p>Aún no hay usuarios.</p>
            }
          </div>
        }
      }
    }

    @if (pending(); as change) {
      <app-auth-modal [title]="dialogTitle(change)" titleId="role-change-title" closeLabel="Cerrar" [maxWidth]="480" (closed)="cancel()">
        <p class="dialog-text">{{ change.grant ? 'Esta cuenta podrá administrar Cinesync.' : 'Esta cuenta perderá su acceso de administración.' }} {{ freshness }}</p>
        <div class="dialog-actions">
          <button class="btn btn-ghost" type="button" data-initial-focus (click)="cancel()">Cancelar</button>
          <button class="btn" type="button" [class.btn-danger]="!change.grant" [class.btn-primary]="change.grant"
                  [disabled]="saving()" (click)="confirm()">Confirmar</button>
        </div>
      </app-auth-modal>
    }
  `,
})
export class AdminUsersPageComponent implements OnInit {
  private readonly api = inject(UsersAdminApiService);
  private readonly toasts = inject(ToastService);
  private request?: Subscription;
  private trigger: HTMLElement | null = null;
  private pageNumber = 1;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly phase = signal<Phase>('loading');
  protected readonly result = signal<UserPage | null>(null);
  protected readonly failure = signal('');
  protected readonly applied = signal('');
  protected readonly pending = signal<RoleChange | null>(null);
  protected readonly saving = signal(false);
  protected readonly skeletonRows = [1, 2, 3, 4, 5];
  protected readonly lastAdminMessage = LAST_ADMIN_MESSAGE;
  protected readonly freshness = FRESHNESS;
  protected readonly isAdmin = isAdmin;
  protected readonly roleLabel = (role: Role): string => ROLE_LABELS[role];

  /** Only when the list is the whole directory can the page know a single ADMIN is the last one; otherwise the API decides. */
  protected readonly soleAdminId = computed(() => {
    const result = this.result();
    if (!result || this.applied() || result.meta.totalPages > 1) {
      return null;
    }
    const admins = result.data.filter(isAdmin);
    return admins.length === 1 ? admins[0].id : null;
  });

  protected readonly summary = computed(() => {
    if (this.phase() === 'loading') {
      return 'Cargando usuarios…';
    }
    const total = this.result()?.meta.total ?? 0;
    return this.phase() === 'ready' ? `${total} ${total === 1 ? 'usuario encontrado' : 'usuarios encontrados'}` : '';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  ngOnInit(): void {
    this.load();
  }

  protected applySearch(event: Event): void {
    event.preventDefault();
    this.runSearch();
  }

  private runSearch(): void {
    this.applied.set(this.search.value.trim());
    this.pageNumber = 1;
    this.load();
  }

  protected clearSearch(): void {
    this.search.setValue('');
    this.runSearch();
  }

  protected goTo(page: number): void {
    this.pageNumber = page;
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.phase.set('loading');
    this.request = this.api.list({ email: this.applied() || undefined, page: this.pageNumber, limit: PAGE_SIZE }).subscribe({
      next: result => {
        this.result.set(result);
        this.phase.set('ready');
      },
      error: err => {
        this.failure.set(adminErrorMessage(asApiError(err)));
        this.phase.set('failed');
      },
    });
  }

  protected ask(user: UserSummary, trigger: HTMLElement): void {
    this.trigger = trigger;
    this.pending.set({ user, grant: !isAdmin(user) });
  }

  protected dialogTitle(change: RoleChange): string {
    return `¿${change.grant ? 'Dar el rol de administrador a' : 'Quitar el rol de administrador a'} ${change.user.email}?`;
  }

  protected cancel(): void {
    if (!this.saving()) {
      this.closeDialog();
    }
  }

  protected confirm(): void {
    const change = this.pending();
    if (!change || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.api.setAdmin(change.user.id, change.grant).subscribe({
      next: updated => {
        this.result.update(page => page && { ...page, data: page.data.map(u => (u.id === updated.id ? updated : u)) });
        this.toasts.show(`Rol de administrador ${change.grant ? 'otorgado a' : 'retirado a'} ${change.user.email}. ${FRESHNESS}`, 'success');
        this.finish();
      },
      error: err => {
        const error = asApiError(err);
        this.toasts.show(adminErrorMessage(error), 'error');
        this.finish();
        if (error.status === 409) {
          this.load();
        }
      },
    });
  }

  private finish(): void {
    this.saving.set(false);
    this.closeDialog();
  }

  private closeDialog(): void {
    this.pending.set(null);
    this.trigger?.focus();
    this.trigger = null;
  }
}
