import { Routes } from '@angular/router';
import { roleGuard } from '../guards/role.guard';

/**
 * Exposed to the shell as './admin-routes' and mounted at /admin/users, so the users page is the empty path.
 * Run alone, standalone.routes.ts mounts it at the same address.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    title: 'Administración · Roles de usuarios',
    canActivate: [roleGuard],
    loadComponent: () => import('./pages/admin-users-page.component').then(m => m.AdminUsersPageComponent),
  },
];
