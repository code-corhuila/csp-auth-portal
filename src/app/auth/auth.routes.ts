import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

/** Exposed to the shell as './routes'. */
export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register-page.component').then(m => m.RegisterPageComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password-page.component').then(m => m.ForgotPasswordPageComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password-page.component').then(m => m.ResetPasswordPageComponent),
  },
  {
    path: 'profile',
    title: 'Mi perfil · Cambiar correo',
    canActivate: [authGuard],
    loadComponent: () => import('./profile/profile-page.component').then(m => m.ProfilePageComponent),
  },
];
