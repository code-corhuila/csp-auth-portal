# Changelog

All notable changes of `csp-auth-portal` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/). A release is a `release/<version>` branch cut from `main` and filled with the commits of `qa`,
re-applied with `git cherry-pick -x` (numerals 6.2.3, 10 and 11 of the course norm); it reaches `main` by pull request, never by merging `qa`,
and is tagged `v<version>` once it is merged.

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
