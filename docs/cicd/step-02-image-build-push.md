# Step 2 — Container image build & push

**Goal:** every push to `main` / `deployment/**` produces signed, scanned, immutable container images on DockerHub for all 10 services.

## File added

`.github/workflows/build-and-push.yml` — matrix workflow building all backend + AI service images.

## What it builds

| # | Service | Image |
|---|---|---|
| 1 | user-service | `azizbna/pi-clouddoom-user-service` |
| 2 | interview-service | `azizbna/pi-clouddoom-interview-service` |
| 3 | training-service | `azizbna/pi-clouddoom-training-service` |
| 4 | mentorship-service | `azizbna/pi-clouddoom-mentorship-service` |
| 5 | quiz-service | `azizbna/pi-clouddoom-quiz-service` |
| 6 | community-service | `azizbna/pi-clouddoom-community-service` |
| 7 | resource-service | `azizbna/pi-clouddoom-resource-service` |
| 8 | ai-training-path | `azizbna/pi-clouddoom-ai-training-path` |
| 9 | kokoro | `azizbna/pi-clouddoom-kokoro` |
| 10 | ollama-deploy | `azizbna/pi-clouddoom-ollama` |

> Frontend is intentionally **not** in this matrix — it deploys to Vercel as static assets in Step 3, no container image needed.

## Tag strategy

Each successful build pushes multiple tags so any consumer can pin at the granularity they need:

| Tag | When | Purpose |
|---|---|---|
| `sha-<short>` | Always | Immutable, unique per commit — **what deploy workflows pin to** |
| `<branch>` | Always | Moving pointer: `main`, `deployment-hybrid-…` |
| `latest` | Default branch only | Convenience pointer to newest main build |
| `<semver>` | On `v*.*.*` git tags | Release tags |

The current mutable `:fixed` tag is **not touched** — existing pods keep running their pinned `:fixed` image until you cut them over to a `sha-...` tag (Step 4 handles that).

## Security gates baked into the build

1. **Trivy** scans the built image and **fails the job on CRITICAL or HIGH** vulnerabilities (with `ignore-unfixed: true` so we don't fail on issues with no upstream fix yet). SARIF report uploaded as an artifact.
2. **Cosign** keyless signing via GitHub OIDC — no private key to manage. Every signed digest is publicly verifiable with:
   ```bash
   cosign verify docker.io/azizbna/pi-clouddoom-<svc>:sha-<short> \
     --certificate-identity-regexp "https://github.com/Mohamed-Fedi-Hamrouni/Pi-CloudDOOM/.*" \
     --certificate-oidc-issuer https://token.actions.githubusercontent.com
   ```
3. **SBOM** and **build provenance** (mode=max) attached as OCI attestations by `docker/build-push-action@v6`.

## Build performance

- `docker/setup-buildx-action@v3` enables BuildKit features.
- `cache-from: type=gha,scope=<service>` + `cache-to: type=gha,...,mode=max` — per-service GHA cache; second build of an unchanged service finishes in ~30 s.
- Matrix `fail-fast: false` — one service breaking doesn't kill the other 9.

## Required GitHub secrets

| Secret | Purpose |
|---|---|
| `DOCKERHUB_USERNAME` | `azizbna` |
| `DOCKERHUB_TOKEN` | Personal access token from https://hub.docker.com/settings/security with `Read, Write, Delete` |

Cosign needs no secret (uses repo OIDC via `id-token: write`).

## Triggers

- `push` to `main` or `deployment/**` (excluding doc-only and frontend-only changes via `paths-ignore`) → builds all 10.
- Tag push `v*.*.*` → builds all 10 with the semver tag.
- `workflow_dispatch` → manual; can target a single service via the `service` input.

## OpenStack impact

**None.** DockerHub repos under `azizbna/pi-clouddoom-*` are already public — verified via the Hub API. Cluster pulls anonymously, no `imagePullSecret` needed.

## Caveats

- **`ollama-deploy` is large** (~2 GB after baking `llama3.2:3b`). First build may take ~20 min and use significant runner disk. Subsequent builds benefit from layer cache.
- **`ai-training-path` runs `train.py` at build time** (per its Dockerfile). Build is CPU-bound for ~2 min — acceptable on `ubuntu-latest`.
- **Trivy DB rate limits**: under heavy CI load Trivy can fail to download its DB. We accept the build failing in that case rather than skipping the scan — re-run from the GH UI.

## How to verify after the first run

```bash
# List built tags
docker pull docker.io/azizbna/pi-clouddoom-user-service:sha-<short>
docker inspect docker.io/azizbna/pi-clouddoom-user-service:sha-<short> | jq '.[0].RepoTags, .[0].RepoDigests'

# Verify signature
cosign verify docker.io/azizbna/pi-clouddoom-user-service:sha-<short> \
  --certificate-identity-regexp "https://github.com/.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Next

Step 3 — Vercel preview + prod deploys for the frontend. Needs `VERCEL_TOKEN` secret.
