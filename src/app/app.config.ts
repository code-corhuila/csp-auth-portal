import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { STANDALONE_ROUTES } from './standalone.routes';

/**
 * Standalone runs only. Deliberately NO provideHttpClient() (Annex H): inside the shell the portal uses the
 * shell's client. The screens that call the API (login, registration, recovery, administration) can only be
 * exercised through the shell; run alone, only the routes that need no API open.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(STANDALONE_ROUTES),
  ],
};
