# Changelog

All notable changes of `csp-auth-portal` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/). A release is a `release/<version>` branch cut from `main` and filled with the commits of `qa`,
re-applied with `git cherry-pick -x` (numerals 6.2.3, 10 and 11 of the course norm); it reaches `main` by pull request, never by merging `qa`,
and is tagged `v<version>` once it is merged.

## [Unreleased]

## [3.0.0] - 2026-10-15

### Added

- `/auth/reset-password` page (HU-AUTH-006, ADR-050): reads the token from the URL fragment `#token=<uuid>` (never the query string), replaces the address so the token does not stay in the address bar or the history, and sets the new password with `POST /api/v1/auth/reset-password` (`AuthApiService.resetPassword()`, no `Idempotency-Key`). The form asks for the password and its confirmation with the registration rules (8 to 72 bytes, one uppercase letter, one digit; `password-rules.ts`). `204` confirms and links to login; `401 INVALID_TOKEN` and a missing or malformed token offer a link to request a new one; `400`, `404`, `429` and `5xx` show Spanish messages decided by the portal (`password-reset-error-message.ts`). The forgot-password page uses the same messages for its failures instead of the text of the shell.
- `resetPassword` joins the requests table checked against the auth contract (`src/contract/auth-service.requirements.json`, `npm run test:contract`); `AuthApiService` documents `auth-service` 1.7.0.
- The login says how long to wait after the failed-attempts limit (HU-AUTH-005, [csp-auth-portal#71](https://github.com/code-corhuila/csp-auth-portal/issues/71)): a `429` that carries `retryAfterSeconds` (the `Retry-After` of the auth API, read by the shell) shows "Demasiados intentos fallidos. Inténtalo de nuevo en N minutos.", with the seconds rounded up to whole minutes and "1 minuto" in the singular. Without the value the text keeps saying "en unos minutos". `shell-contract.ts` declares the optional `retryAfterSeconds` of `ApiError`.
- `/auth/profile` page (any signed-in role, behind `authGuard`): shows the current email and changes it in two steps, a form that requests the change (`PATCH /api/v1/auth/me/email`, `202`) and a
  6-digit code form that confirms it (`POST /api/v1/auth/me/email/verify`, `204`). The code is a string (leading zeros kept), is never logged or stored, and takes the focus after the request.
  Every cause of an invalid code shows one generic Spanish message with an option to request a new code; `409` (address in use, also at the confirmation), `429`, `401` and network failures are
  mapped to Spanish messages (`profile-error-message.ts`); the success toast and the displayed email use the confirmed address (HU-AUTH-004, [#56](https://github.com/code-corhuila/csp-auth-portal/issues/56)).
- `AuthApiService.requestEmailChange()` / `verifyEmailChange()` and `AuthSessionService.updateEmail()`.
- The session survives a reload and is renewed: the refresh token is kept in `sessionStorage` (never `localStorage`), `AuthSessionService.restore()` renews the session at startup with
  `POST /api/v1/auth/refresh`, the access token is renewed 60 s before it expires (one request in flight, shared by concurrent callers), the refresh token rotates on every renewal,
  and `signOut()` revokes it with `POST /api/v1/auth/logout` and clears the storage even if the call fails. A rejected token (`401`, `423`) ends the session; a transient failure keeps the stored token; a failed restore at page load is silent and only a failed renewal in an active session shows a toast
  (HU-AUTH-003, [#50](https://github.com/code-corhuila/csp-auth-portal/issues/50)).
- `RefreshTokenStore` and `AuthApiService.refresh()` / `logout()`.
- `/admin/users` page, exposed to the shell as `./admin-routes` (`ADMIN_ROUTES`, guarded by `roleGuard`): an administrator searches accounts by email prefix,
  pages through them and grants or revokes `ADMIN` after a confirmation dialog. Loading, empty and error states; the last-administrator conflict
  (`409 LAST_ADMIN`) and a user left without roles (`409 USER_WITHOUT_ROLES`) are error toasts; the success toast states that the role takes effect at the next login or token refresh
  (HU-AUTH-003, [#42](https://github.com/code-corhuila/csp-auth-portal/issues/42)).
- `UsersAdminApiService` (`GET /api/v1/auth/users`, `PATCH /api/v1/auth/users/{userId}/role` with an `Idempotency-Key`) and the toast type `error`.
- `AuthModalComponent` accepts `closeLabel` and focuses the element marked `data-initial-focus` before the first field.

### Fixed

- A contract check keeps the requests of the portal equal to what `auth-service.yaml` requires: `src/contract/auth-service.requirements.json` lists the operations the portal calls and their required headers, `scripts/check-contract.mjs` (`npm run test:contract`, with `AUTH_CONTRACT_FILE`) compares that table with the contract in CI, and `auth-api.contract.spec.ts` makes every call and checks the headers, which would have caught the missing `Idempotency-Key` of the email change (HU-AUTH-004, [#68](https://github.com/code-corhuila/csp-auth-portal/issues/68)).
- The email change sends the `Idempotency-Key` header that the contract requires on `PATCH /api/v1/auth/me/email` and `POST /api/v1/auth/me/email/verify`: the API answers `400` without it, so the profile page could not change an email (HU-AUTH-004, [#65](https://github.com/code-corhuila/csp-auth-portal/issues/65)).
- Login shows a Spanish message when the API limits failed attempts (`429`, `RATE_LIMITED` or the gateway's `TOO_MANY_REQUESTS`): "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos." The shell's `ApiError` does not expose `Retry-After`, so the message carries no time (HU-AUTH-005, [#63](https://github.com/code-corhuila/csp-auth-portal/issues/63)).

### Changed

- The container refuses to start when `CORS_ALLOWED_ORIGIN_REGEX` does not start with `^` and end with `$`, the CI checks an empty and two unanchored values, and the `.json` location serves `remoteEntry.json` only, not `importmap.json` (ADR-026 Amendment 2026-10-19, [#58](https://github.com/code-corhuila/csp-auth-portal/issues/58)).
- `AuthSessionService` no longer is "memory only": it keeps the refresh token in `sessionStorage`; the access token stays in memory
  ([#50](https://github.com/code-corhuila/csp-auth-portal/issues/50)).
- The standalone configuration no longer provides `provideHttpClient()` (Annex H, as the catalog and booking portals); the standalone root opens the placeholder billboard because the screens
  that call the API need the shell's client ([#50](https://github.com/code-corhuila/csp-auth-portal/issues/50)).
- Sign in, registration and password recovery call `csp-auth-api` through the shell's HTTP client (`POST /api/v1/auth/login`, `/register` with an
  `Idempotency-Key`, `/forgot-password`) instead of answering from a dataset; the portal no longer compares or stores a password
  (HU-AUTH-003, [#39](https://github.com/code-corhuila/csp-auth-portal/issues/39)).
- `AuthSessionService` keeps the access token in memory and exposes it through `./session` as `accessToken()`, so the shell can send the Bearer token.
- The password recovery page shows the failure (for example `429`) instead of staying blocked.

### Removed

- `synthetic-users.ts` and the synthetic dataset: nothing else used it. The specs build their sessions from fixtures.

### Fixed

- The user roles screen (`/admin/users`) is entirely in Spanish: labels, roles (Administrador, Cliente), dialog, toasts, states and `aria` texts. Its failures are
  explained by status and error code (`admin-error-message.ts`) and never show the English text of the server
  ([#47](https://github.com/code-corhuila/csp-auth-portal/issues/47)).
- Container healthcheck calls `http://127.0.0.1/health` instead of `http://localhost/health` (`deploy/Dockerfile` and `deploy/compose.yml`): inside the container `localhost` resolves first to `::1`, nginx listens on IPv4 only, and Docker reported the portal as `unhealthy` while it served traffic (TD-025).

## [2.0.0] - 2026-10-08

MVP 2 (Cut 2). Story HU-FE-AUTH-001 ([csp-docs#93](https://github.com/code-corhuila/csp-docs/issues/93), story issue
[#1](https://github.com/code-corhuila/csp-auth-portal/issues/1)): the client signs in or registers with a dataset shipped inside the
portal, and the seeded roles drive the access to the protected routes.

### Added

- Sign-in with a synthetic user: invalid credentials are rejected and no session is created; after a successful sign-in the portal
  navigates to the route that was requested (`returnUrl`). ([#9](https://github.com/code-corhuila/csp-auth-portal/issues/9))
- Registration with first name, last name, address, phone, email and password; registering opens the login with the email filled.
  ([#10](https://github.com/code-corhuila/csp-auth-portal/issues/10))
- Password recovery with a neutral confirmation, the same whether or not the account exists.
- Login and registration as modals over the page, with toasts, as in the mockup and with the design system tokens (HU-UI-001,
  [csp-docs#1](https://github.com/code-corhuila/csp-docs/issues/1)). ([#22](https://github.com/code-corhuila/csp-auth-portal/issues/22))
- In-memory session (no credential is stored) and the guards `authGuard` and `roleGuard`: no session goes to the login with
  `returnUrl`, and a route that needs `ADMIN` sends a client to the billboard. ([#8](https://github.com/code-corhuila/csp-auth-portal/issues/8))
- The session is exposed to the shell as the federated module `./session`, so `csp-front` reads the same instance.
  ([#29](https://github.com/code-corhuila/csp-auth-portal/pull/29))
- Specs for the lazy routes, the toast container and the recovery guard; 56 specs, 100% of lines.

### Fixed

- Running the portal alone mounts it under `/auth` as the shell does and stands in for `/movies` and `/admin`, so signing in no longer raises
  `NG04002`. ([#19](https://github.com/code-corhuila/csp-auth-portal/issues/19))
- The shell can load the portal when it runs as a container: nginx now answers `Access-Control-Allow-Origin` for the origins allowed by
  `CORS_ALLOWED_ORIGIN_REGEX`, which the container renders when it starts (ADR-026, amended on 2026-10-08), and CI checks it.
  ([#33](https://github.com/code-corhuila/csp-auth-portal/issues/33))

### Known limits

- The guards (`authGuard`, `roleGuard`) and the roles of the session decide only what the interface shows: with no backend they are not a security boundary, since the dataset and the session live in the browser. Real authorization comes with `csp-auth-api`.
- There is no backend: the dataset (a client and an administrator, with the same fixture password) is burned into the portal and must not
  be deployed to a public environment. It is replaced when `csp-auth-api` is integrated.
- `deploy/nginx.conf` has no `Content-Security-Policy` or `Strict-Transport-Security` header yet.
- No integration or contract tests against an API: the portal does not call one yet.

## [0.1.2] - 2026-10-06

### Added

- `package-lock.json`, the CI workflow and the container files (`deploy/Dockerfile`, `deploy/nginx.conf`, `deploy/compose.yml`).

## [0.1.1] - 2026-10-06

### Added

- Federated runtime (bootstrap, root component, shell contract) and the domain layer: routes, typed models, the synthetic data service and
  placeholder pages.

## [0.1.0] - 2026-10-05

### Added

- Governance files and the Angular 21 and Native Federation project configuration.
