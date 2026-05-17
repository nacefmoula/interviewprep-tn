# Step 3 — Vercel frontend pipeline

**Goal:** every PR touching `frontend/**` produces a preview URL; every merge to `main` deploys to production at `https://interviewprep-tn.me`. All driven by GitHub Actions — no Vercel→GitHub auto-deploy required.

## Files added

| File | When it runs |
|---|---|
| `.github/workflows/vercel-preview.yml` | On PRs that touch `frontend/**`, `vercel.json`, `.vercel/**`, or `.vercelignore` |
| `.github/workflows/vercel-prod.yml` | On push to `main` touching same paths, or manual `workflow_dispatch` |

## How it works

Both workflows use the official Vercel CLI (raw, no third-party action) — fewer surprises and faster debugging:

```
vercel pull   --yes  --environment=<preview|production>   --token=$VERCEL_TOKEN
vercel build  [--prod]                                    --token=$VERCEL_TOKEN
vercel deploy --prebuilt [--prod]                         --token=$VERCEL_TOKEN
```

`vercel pull` fetches the project's env vars and `vercel.json` config locally. `vercel build` produces the static output. `vercel deploy --prebuilt` uploads the already-built artifact (no rebuild on Vercel side, faster + deterministic).

Project & org IDs are inlined as workflow `env:` — they're already public in the committed `.vercel/project.json`:
```
VERCEL_ORG_ID:     team_tQYcRewNfvSBGAbsE6wJwcop
VERCEL_PROJECT_ID: prj_2vhl5NT0TAWAQZkKNWPm3UKs25HL
```

## Preview workflow extras

- **Sticky PR comment**: `marocchino/sticky-pull-request-comment@v2` posts/updates a single comment with the preview URL — no spam on subsequent commits.
- **Concurrency group keyed on PR number**: pushing 3 commits in a row to a PR only keeps the latest preview build.

## Production workflow extras

- **GitHub Environment `production`** with URL `https://interviewprep-tn.me` — shows up in the repo's Environments tab; you can add required reviewers here once you're comfortable.
- **No cancel-in-progress** — prod deploys never get killed mid-flight.
- **Smoke check after deploy**: curls `https://interviewprep-tn.me`, retries 5× with 10s delay. Fails the job if the site is not 200.

## Required GitHub secret

| Secret | Source | Notes |
|---|---|---|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens | Full Account scope. Save before the preview workflow first runs. |

## OpenStack impact

**None.**

## Interaction with Vercel's built-in GitHub integration

Vercel may already be auto-deploying via its GitHub App (configured when the project was linked). With both running you'd get **two preview URLs per PR** — annoying but not broken.

**To make this workflow the single source of truth (recommended):**
1. Vercel dashboard → Project → Settings → **Git** → toggle off **"Connect to Git"** *or* set "Production Branch" to `none`.
2. Keep Vercel linked for env-var management, but disable auto-deploys.

If you want to keep Vercel's auto-deploy and use this workflow only as a safety net, that also works — just expect duplicates.

## Verification

1. After adding `VERCEL_TOKEN`, open any PR that touches `frontend/`. Within 2 min the workflow should post a sticky comment with a preview URL.
2. Merge to `main` → check the **Actions → Vercel — Production** run and the **Environments → production** tab.

## Next

Step 4 — deploy backend container images to the OpenStack Kubernetes cluster. First step requiring real OpenStack action (kubeconfig export).
