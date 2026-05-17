# Contributing

## Workflow
1. Branch from `develop`: `git checkout -b feature/<short-name>`.
2. Make focused commits (Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`, `chore:`).
3. Ensure it builds and tests pass locally (see below).
4. Open a PR into `develop`. CI must be green.
5. `develop` → `main` on release.

## Local checks before pushing

```bash
# Backend service
cd <service> && ./mvnw -q verify

# Frontend
cd frontend && npm ci && npx ng build --configuration production && npm run lint
```

## Conventions
- Backend: keep the canonical Keycloak role normalization (trim + UPPERCASE + single `ROLE_` prefix) consistent across services.
- Schema changes go through Flyway migrations only (`ddl-auto: validate`); never edit an already-applied migration — add a new idempotent one.
- No secrets in source or commits — use environment variables and `infra/.env` (git-ignored). `.env.example` documents the keys.
- Prefer hermetic tests (Testcontainers or infra-free unit tests).

See [`docs/quality/CODE_AUDIT.md`](docs/quality/CODE_AUDIT.md) for the engineering-quality bar applied to this codebase.
