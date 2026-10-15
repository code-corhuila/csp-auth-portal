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

The portal is a remote of the shell (`csp-front`) and exposes `./routes`, `./admin-routes` and `./session` (the in-memory `AuthSessionService`, so the shell can tell whether a person
signed in and read `accessToken()` to send the Bearer token). Inside the shell it creates no HTTP client of its own: it uses the shell's, whose interceptor
adds the gateway URL, the token, the `X-Correlation-Id` and normalises every error (`src/app/shell-contract.ts`). Only the standalone run
(`app.config.ts`) provides `provideHttpClient()`; with no gateway behind the relative `/api/v1/...` paths, the calls fail there.

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

### Administration: user roles (`./admin-routes`)

The second entry point, `src/app/auth/admin/admin.routes.ts` (`ADMIN_ROUTES`), is the `/admin/users` screen of `12-ux-ui/wireframes.md` section 6. The shell mounts it
at `admin/users` (the users page is the empty path) behind `roleGuard`; run alone, `standalone.routes.ts` mounts it at the same address. An administrator searches
accounts by email prefix (`GET /api/v1/auth/users?email=&page=&limit=`) and grants or revokes `ADMIN` after a confirmation
(`PATCH /api/v1/auth/users/{userId}/role` with `{ "role": "ADMIN", "enabled": true|false }` and a fresh `Idempotency-Key`). The role is effective on the
target's next login or token refresh, and the success toast says so. `Revoke` is disabled for the only administrator when the list is the whole directory;
otherwise the API decides and a `409 LAST_ADMIN` or `409 USER_WITHOUT_ROLES` is shown as an error toast and the list reloads. Role changes need the `user:role:update` permission, enforced by the API.

The session lives in memory (`AuthSessionService`: the user summary and the access token; the refresh token is not kept). `authGuard` sends anonymous visitors to
`/auth/login?returnUrl=...`; `roleGuard` opens `/admin` only for `ADMIN` and sends any other
session to `/movies`. The look follows `12-ux-ui/design-system.md` of `csp-docs`.
