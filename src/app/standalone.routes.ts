import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { roleGuard } from './auth/guards/role.guard';
import { StandalonePlaceholderComponent } from './standalone-placeholder.component';

/**
 * Standalone runs only. Mounts the portal under /auth, as the shell does, and stands in for the
 * routes that other portals own, so login can navigate somewhere and /admin can be tried.
 */
export const STANDALONE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: 'auth', children: AUTH_ROUTES },
  { path: 'movies', component: StandalonePlaceholderComponent, data: { title: 'Cartelera (portal de catálogo)' } },
  { path: 'admin', canActivate: [roleGuard], component: StandalonePlaceholderComponent, data: { title: 'Administración' } },
];
