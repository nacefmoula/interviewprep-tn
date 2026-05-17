# Step 8 — Finalize: docs, runbook, baseline tag

**Goal:** the pipeline is operable by someone who didn't build it. Single discoverable entry point + a baseline tag pinning the cut-over point.

## Files added / updated

| File | Status |
|---|---|
| `docs/cicd/README.md` | new — pipeline diagram + secret matrix + runbook |
| `docs/cicd/step-08-finalize.md` | new — this doc |
| `README.md` (root) | updated — Deployment section corrected (registry name) and links to `docs/cicd/` |

## Top-level CI/CD README contents

`docs/cicd/README.md` is the single source of truth for ops:
- ASCII pipeline diagram (PR flow + main-merge flow)
- Index of all 13 workflow files with trigger + purpose
- Full GitHub secrets matrix (7 secrets)
- GitHub Environments matrix
- OpenStack one-time setup script
- Image registry table (10 images)
- Tagging conventions
- Runbook: manual deploy, manual rollback, signature verification, view security findings
- Day-1 known limitations (HA, GitOps, DB migrations, etc.)
- Step-by-step build history linking each commit to its doc

## Root README change

The Deployment section corrected:
- Registry: was `piclouddoom/*` (incorrect), now `azizbna/pi-clouddoom-*`
- Added link to `docs/cicd/README.md` for the full pipeline

## Baseline tag

Tagging the final commit of the day as `v0.1.0-cicd` marks the cut-over point. Image consumers (the cluster + ACA) keep running `:fixed` until you manually trigger the deploy workflow for the first time, at which point `sha-<short>` tags take over.

## OpenStack impact

**None.**

## What you do next (in order, when ready)

1. **Create the 7 GitHub secrets** (see `docs/cicd/README.md`).
2. **Run the OpenStack one-time setup** on `k8s-cp1`.
3. **Configure GitHub Environments** (`production` with 1 required reviewer, `dev` open).
4. **Trigger `Build & Push images` manually** via Actions UI on the deployment branch.
5. **Watch `Deploy — OpenStack K8s` auto-fire** once the build succeeds.
6. **Optionally disable Vercel's built-in GitHub auto-deploy** to avoid duplicate previews.
7. **Triage initial CodeQL / Trivy / kube-linter findings** in the Security tab.

## Done

```
[████████████████████] 9 / 9 steps complete
```

The pipeline is operational. Ship it.
