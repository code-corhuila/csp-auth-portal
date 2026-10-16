import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { STANDALONE_ROUTES } from './standalone.routes';

/**
 * Standalone runs only. This is the one place the portal provides an HttpClient: inside the shell it uses the
 * shell's, whose interceptor adds the gateway URL, the token and the correlation id. Alone, the relative
 * '/api/v1/...' paths have no gateway behind them, so only the screens that need no API can be exercised.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideRouter(STANDALONE_ROUTES),
  ],
};
