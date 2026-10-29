import { Routes } from '@angular/router';
import { ADMIN_ROUTES } from './auth/admin/admin.routes';
import { AUTH_ROUTES } from './auth/auth.routes';
import { roleGuard } from './auth/guards/role.guard';
import { StandalonePlaceholderComponent } from './standalone-placeholder.component';

/**
 * Standalone runs only. Mounts the portal under /auth, as the shell does, and stands in for the
 * routes that other portals own, so login can navigate somewhere and /admin can be tried. The shell mounts
 * ADMIN_ROUTES at /admin/users the same way. The root opens the placeholder billboard: the login screen needs
 * the shell's HttpClient, which a standalone run does not have.
 */
export const STANDALONE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'movies' },
  { path: 'auth', children: AUTH_ROUTES },
  { path: 'movies', component: StandalonePlaceholderComponent, data: { title: 'Cartelera (portal de catálogo)' } },
  { path: 'admin/users', children: ADMIN_ROUTES },
  { path: 'admin', canActivate: [roleGuard], component: StandalonePlaceholderComponent, data: { title: 'Administración' } },
];
