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

The portal is a remote of the shell (`csp-front`) and exposes `./routes`. It creates no HTTP client of
its own: inside the shell it would use the shell's.

## Cut 2: synthetic users (HU-FE-AUTH-001)

There is no `csp-auth-api` in Cut 2. The portal signs in against a dataset burned into
`src/app/auth/data/synthetic-users.ts`. These are not real credentials.

| Email | Password | Roles |
|---|---|---|
| `maria@cinesync.com` | `SecurePass123!` | `CLIENT` |
| `admin@cinesync.com` | `SecurePass123!` | `CLIENT`, `ADMIN` |

Registering a new account adds a `CLIENT` to the in-memory list; a page reload forgets it.

| Route (under `/auth`) | Behaviour |
|---|---|
| `login` | Starts a session and goes to the `returnUrl` it was given, or to the billboard `/movies` |
| `register` | Creates a `CLIENT`, starts a session and goes to `/movies` |
| `forgot-password` | Always confirms neutrally, whether or not the account exists |

The session lives in memory (`AuthSessionService`). `authGuard` sends anonymous visitors to
`/auth/login?returnUrl=...`; `roleGuard` opens `/admin` only for `ADMIN` and sends any other
session to `/movies`. The look follows `12-ux-ui/design-system.md` of `csp-docs`.
