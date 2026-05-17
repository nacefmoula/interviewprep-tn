# Step 1 — CI scaffolding

**Goal:** every PR and every push to `main` / `deployment/**` runs lint/test/build for *only the services that changed*. No deploy logic yet.

## Files added

| File | Purpose |
|---|---|
| `.github/dependabot.yml` | Weekly dependency PRs for Maven (7 services), npm (frontend), pip (ai-training-path), Docker base images (10 Dockerfiles), and GitHub Actions itself. Grouped to keep PR noise low. |
| `.github/workflows/ci.yml` | Orchestrator. Uses `dorny/paths-filter` to detect changes per service, then dispatches to the reusable workflows below. Ends in a `ci-summary` aggregate job for branch protection. |
| `.github/workflows/ci-spring-service.yml` | Reusable: `setup-java` (Temurin, with Maven cache) + `mvn -B -ntp -DskipITs verify`. Inputs: `service`, `java` (default 21). |
| `.github/workflows/ci-python-service.yml` | Reusable: `setup-python` + `pip install -r requirements.txt` + `compileall` syntax check + `import app` smoke. Runs `pytest` only if test files exist. |
| `.github/workflows/ci-frontend.yml` | Reusable: `setup-node` + `npm ci` + `npx ng build --configuration production`. Uploads the dist as an artifact on `main`. |

## Design choices

- **Reusable workflows** (one per language family) keep CI logic in one place. The orchestrator just dispatches with parameters.
- **`paths-filter`** ensures a PR that only touches `frontend/` doesn't trigger 7 Maven builds — keeps CI fast and cheap.
- **`-DskipITs`** for Maven runs unit tests only. Integration tests (which often need Postgres/Redis/Kafka) are deferred until we add service containers.
- **Java 17 for `quiz-service`**, Java 21 for the other six — matches the current Spring Boot version split (3.4.1 vs 4.0.4).
- **Frontend has no `test` / `lint` npm script** in `package.json` — we run only `ng build` for now. Adding `ng test` + `ng lint` is a follow-up.
- **`ai-training-path` has no project tests** today (only `venv/` fixtures); CI verifies deps install and the FastAPI app imports cleanly.
- **`ci-summary` aggregator** — single required status check for branch protection so reviewers don't have to tick 9 boxes.
- **Concurrency**: in-flight runs on the same ref auto-cancel to save minutes.

## OpenStack impact

None.

## What this catches today

- Broken Maven builds (compile errors, missing deps, failing unit tests).
- Broken Angular production builds.
- Broken Python imports / `requirements.txt` resolution.

## What it does **not** catch yet (deferred to later steps)

- Container image build failures (Step 2 adds Docker build).
- Vulnerabilities (Step 2 adds Trivy; Step 6 adds CodeQL).
- Integration tests against Postgres/Kafka (post-launch).

## Verification

After committing this step:
1. Open a tiny PR touching `frontend/README.md` only → expect only the `frontend` job to run.
2. Open a PR touching `user-service/pom.xml` → expect only the `user` job.
3. Watch GitHub Actions UI: jobs should run in parallel for multi-service PRs.

## Next

Step 2 — container build & push to DockerHub (`azizbna/pi-clouddoom-*`), with Trivy scan and cosign keyless signing.
