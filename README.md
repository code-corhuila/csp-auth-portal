# csp-auth-portal

> auth bounded context: web UI (remote)

Part of the **Cinesync Platform** distributed system — team `cinesync-platform`, Group 1.
Governance and documentation live in [`csp-docs`](https://github.com/code-corhuila/csp-docs).

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `csp-docs`.

## Run and test

Node 22 LTS or 24.

```
npm ci
npm start        # serve the portal
npm run lint
npm test         # Karma + Jasmine
npm run build
```

The portal is a remote of the shell (`csp-front`) and exposes `./routes`, `./admin-routes` and `./session` (`AuthSessionService`, so the shell can tell whether a person
signed in, read `accessToken()` to send the Bearer token, call `restore()` at startup and `signOut()` to leave; see "Session" below). Inside the shell it creates no HTTP client of its own: it uses the shell's, whose interceptor
adds the gateway URL, the token, the `X-Correlation-Id` and normalises every error (`src/app/shell-contract.ts`). The portal never calls `provideHttpClient()` (Annex H),
not even in the standalone run (`app.config.ts`): alone, the screens that call the API (login, registration, password recovery, administration) cannot work, so the root
opens the placeholder billboard. Exercise them through the shell.

## Container

```
docker network create csp-frontend   # once
docker compose -f deploy/compose.yml up --build
```

The image listens on port 4201. The shell loads this portal from another origin, so the container
renders its CORS rule from the environment when it starts (ADR-026) and refuses to start without it:

| Variable | Meaning | Development value |
|---|---|---|
| `CORS_ALLOWED_ORIGIN_REGEX` | Origins allowed to load `remoteEntry.json` and the modules of the portal | `^http://localhost:420[0-5]$` |

`deploy/compose.yml` sets the development value when the variable is not defined. CI builds the image and checks
that it answers the allowed origin, stays silent for any other, and does not start without the variable.

## Authentication against csp-auth-api (HU-AUTH-003)

The portal calls the real `csp-auth-api` through the gateway (`auth-service.yaml` 1.5.0). `AuthApiService` is the only class that talks to it;
the portal never compares or stores a password. Sign in and registration need the API, the gateway and the shell running.

| Route (under `/auth`) | Behaviour |
|---|---|
| `login` | Modal. `POST /api/v1/auth/login`; starts a session, shows a toast and goes to the `returnUrl` it was given, or to the billboard `/movies` |
| `register` | Modal. `POST /api/v1/auth/register` with an `Idempotency-Key`; creates a `CLIENT` without signing in, then opens `login` with the email filled and a toast, as in the mockup |
| `forgot-password` | Modal. `POST /api/v1/auth/forgot-password`; always confirms neutrally (202), whether or not the account exists |

### Session (restore and renewal)

`AuthSessionService` keeps the user and the access token in memory only. The refresh token is kept in `sessionStorage` (key `csp.auth.refresh`, never `localStorage`,
so closing the tab ends the session) by `RefreshTokenStore`, which tolerates an unavailable storage and ignores a corrupted value. Tokens are never logged.

| Member | Behaviour |
|---|---|
| `restore(): Promise<void>` | The shell calls it after connecting and waits for it before the first navigation. Without a kept token it resolves at once; otherwise it renews with `POST /api/v1/auth/refresh`. It resolves when the attempt finished, whatever the outcome, and never rejects |
| `refresh(): Promise<void>` | Renews the tokens (the refresh token rotates: the new one is stored). Concurrent callers share one request. Never rejects |
| automatic renewal | After each `start()` a timer renews the access token 60 s before the `expiresIn` the API returned (at least 5 s from now); `end()` cancels it |
| `signOut(): Promise<void>` | `POST /api/v1/auth/logout` with the refresh token (the shell's interceptor adds the Bearer), then clears the memory and the storage even if the call fails |
| `end()` | Clears the memory, the timer and the stored refresh token, without calling the API |

When a renewal fails with `401` or `423` the session ends and the stored token is removed; a transient failure (status `0`, `5xx`, timeout) ends only the in-memory session and keeps the stored
token, so a reload can retry. A person in an active session is told with a Spanish toast (sign in again, or reload to retry); a failed `restore()` at page load is silent: the guard sends
the person to `/auth/login?returnUrl=...`.

### Administration: user roles (`./admin-routes`)

The second entry point, `src/app/auth/admin/admin.routes.ts` (`ADMIN_ROUTES`), is the `/admin/users` screen of `12-ux-ui/wireframes.md` section 6. The shell mounts it
at `admin/users` (the users page is the empty path) behind `roleGuard`; run alone, `standalone.routes.ts` mounts it at the same address. An administrator searches
accounts by email prefix (`GET /api/v1/auth/users?email=&page=&limit=`) and grants or revokes `ADMIN` after a confirmation
(`PATCH /api/v1/auth/users/{userId}/role` with `{ "role": "ADMIN", "enabled": true|false }` and a fresh `Idempotency-Key`). The role is effective on the
target's next login or token refresh, and the success toast says so. All the text of the screen is Spanish; failures are mapped by status and code to Spanish messages (`admin-error-message.ts`), never the server's text. `Revoke` is disabled for the only administrator when the list is the whole directory;
otherwise the API decides and a `409 LAST_ADMIN` or `409 USER_WITHOUT_ROLES` is shown as an error toast and the list reloads. Role changes need the `user:role:update` permission, enforced by the API.

The session lives in memory (`AuthSessionService`: the user summary and the access token; the refresh token is not kept). `authGuard` sends anonymous visitors to
`/auth/login?returnUrl=...`; `roleGuard` opens `/admin` only for `ADMIN` and sends any other
session to `/movies`. The look follows `12-ux-ui/design-system.md` of `csp-docs`.
