# Pi-CloudDOOM — CI/CD pipeline

End-to-end automation for the hybrid stack: **GitHub → DockerHub → (OpenStack K8s + Azure Container Apps + Vercel)**.

## Pipeline diagram

```
                                            ┌────────────────────────────────┐
PR opened ───► CI per-service ──────────────┤ paths-filter → reusable wfs    │
              CodeQL · IaC scan · Gitleaks  └────────────────────────────────┘
              └────► Vercel preview URL on PR (sticky comment)

Merge to main / push to deployment/** ─────────────────────────────────────
                          │
                          ▼
          ┌─────────────────────────────────────┐
          │ Build & Push images (matrix × 10)    │
          │ Buildx + GHA cache → DockerHub       │
          │ Trivy scan (CRITICAL/HIGH = fail)    │
          │ Cosign keyless signing (OIDC)        │
          │ Tags: sha-<short>, branch, latest    │
          └────────┬─────────────────┬──────────┘
                   │                 │
        ┌──────────┘                 └──────────┐
        ▼                                       ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│ Deploy — OpenStack K8s   │         │ Deploy — Azure ACA       │
│ matrix × 7 Spring svcs   │         │ matrix × 3 AI svcs       │
│ kubectl set image …      │         │ az containerapp update … │
│ rollout status (5m)      │         │ revision health poll     │
│ → Smoke test (in-cluster)│         │ → auto-rollback if Failed│
│ → Auto-rollback on red   │         │                          │
└──────────────────────────┘         └──────────────────────────┘
                                                 
        Push to main (frontend/**) ──► Vercel — Production
                                       prod URL: https://interviewprep-tn.me
```

## Workflows index

| File | Trigger | Purpose |
|---|---|---|
| `ci.yml` | PR, push | Lint / test / build per changed service (Java / Python / Angular) |
| `ci-spring-service.yml` | reusable | Maven `verify` per Spring service |
| `ci-python-service.yml` | reusable | `pip install` + `compileall` + import smoke |
| `ci-frontend.yml` | reusable | `npm ci` + `ng build` production |
| `build-and-push.yml` | push to main / deployment/**, tags `v*.*.*`, manual | Build, scan (Trivy), sign (cosign), push 10 images to DockerHub |
| `deploy-k8s.yml` | `workflow_run` after build (success), manual | Roll the 7 Spring services into `piclouddoom` or `piclouddoom-dev` + smoke + rollback |
| `deploy-aca.yml` | `workflow_run` after build (success), manual | Roll the 3 AI services into Azure Container Apps + health poll + rollback |
| `vercel-preview.yml` | PR touching frontend | Preview deploy + sticky PR comment |
| `vercel-prod.yml` | push to main touching frontend | Production deploy + smoke |
| `codeql.yml` | PR, push, weekly | SAST across java / js / python / actions |
| `iac-scan.yml` | PR, push to k8s/ or infra/ | Trivy config + kube-linter (report-only) |
| `gitleaks.yml` | PR, push, weekly | Full-history secret scan |
| `dependabot.yml` | scheduled | Weekly grouped dep PRs (Maven, npm, pip, Docker, GH Actions) |

## Required GitHub secrets

| Secret | Used by | How to obtain |
|---|---|---|
| `DOCKERHUB_USERNAME` | `build-and-push` | Your DockerHub username — `azizbna` |
| `DOCKERHUB_TOKEN` | `build-and-push` | https://hub.docker.com/settings/security → New Access Token (Read/Write/Delete) |
| `VERCEL_TOKEN` | `vercel-preview`, `vercel-prod` | https://vercel.com/account/tokens → Full Account |
| `KUBECONFIG_PROD` | `deploy-k8s` (prod path) | `scripts/extract-kubeconfig.sh` on `k8s-cp1` |
| `KUBECONFIG_DEV` | `deploy-k8s` (dev path) | `NAMESPACE=piclouddoom-dev scripts/extract-kubeconfig.sh` |
| `AZURE_CREDENTIALS` | `deploy-aca` | `az ad sp create-for-rbac --sdk-auth` JSON |
| `AZURE_RESOURCE_GROUP` | `deploy-aca` | Plain string — your RG name |

## GitHub Environments

Configure under **Repo → Settings → Environments**:

| Environment | Used by | Recommended protections |
|---|---|---|
| `production` | `deploy-k8s` (prod), `deploy-aca`, `vercel-prod` | 1 required reviewer, restrict to `main` and `deployment/hybrid-openstack-azure-vercel` |
| `dev` | `deploy-k8s` (dev path) | None |

## OpenStack one-time setup

Run on `k8s-cp1`:

```bash
# Prod
kubectl apply -f k8s/rbac/cicd-deployer.yaml
bash scripts/extract-kubeconfig.sh > /tmp/kubeconfig-prod.yaml
# → paste contents as KUBECONFIG_PROD secret, then:
shred -u /tmp/kubeconfig-prod.yaml

# Dev
kubectl apply -f k8s/base/namespace-dev.yaml
kubectl apply -f k8s/rbac/cicd-deployer-dev.yaml
NAMESPACE=piclouddoom-dev bash scripts/extract-kubeconfig.sh > /tmp/kubeconfig-dev.yaml
# → paste as KUBECONFIG_DEV, then shred
```

## Image registry

DockerHub, namespace `azizbna`, all repos **public** (no `imagePullSecret` needed in cluster).

| Service | Image |
|---|---|
| user-service       | `docker.io/azizbna/pi-clouddoom-user-service`       |
| interview-service  | `docker.io/azizbna/pi-clouddoom-interview-service`  |
| training-service   | `docker.io/azizbna/pi-clouddoom-training-service`   |
| mentorship-service | `docker.io/azizbna/pi-clouddoom-mentorship-service` |
| quiz-service       | `docker.io/azizbna/pi-clouddoom-quiz-service`       |
| community-service  | `docker.io/azizbna/pi-clouddoom-community-service`  |
| resource-service   | `docker.io/azizbna/pi-clouddoom-resource-service`   |
| ai-training-path   | `docker.io/azizbna/pi-clouddoom-ai-training-path`   |
| kokoro             | `docker.io/azizbna/pi-clouddoom-kokoro`             |
| ollama-deploy      | `docker.io/azizbna/pi-clouddoom-ollama`             |

Tagging:

| Tag | Meaning |
|---|---|
| `sha-<short>` | Immutable, unique per commit. **Used by all deploy workflows.** |
| `<branch>` | Moving pointer per branch |
| `latest` | Updated only on `main` |
| `v*.*.*` | Release tags |
| `fixed` | Legacy mutable tag — left in place until full cut-over |

## Runbook — common operations

### Manually deploy a single service

```
GitHub → Actions → "Deploy — OpenStack K8s" → Run workflow
  branch:      deployment/hybrid-openstack-azure-vercel
  environment: prod
  sha:         (leave blank)
  service:     interview-service
```

### Roll back to a specific SHA

```
GitHub → Actions → "Deploy — OpenStack K8s" → Run workflow
  environment: prod
  sha:         <old git sha>     # workflow uses sha-<7-char> as image tag
  service:     (leave blank, all)
```

### Emergency manual rollback from `k8s-cp1`

```bash
kubectl -n piclouddoom rollout undo deployment/user-service
kubectl -n piclouddoom rollout status deployment/user-service
```

### Verify image signatures (any developer)

```bash
cosign verify docker.io/azizbna/pi-clouddoom-user-service:sha-<short> \
  --certificate-identity-regexp "https://github.com/Mohamed-Fedi-Hamrouni/Pi-CloudDOOM/.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

### View security findings

GitHub → Security → Code scanning. Categories: `trivy-k8s`, `trivy-infra`, `kube-linter`, plus CodeQL languages.

## Day-1 known limitations (post-launch backlog)

1. **No HA**: single replica per app, single Postgres, single Kafka, single K8s control-plane node.
2. **No GitOps**: deploys are imperative `kubectl set image`; consider Argo CD post-launch.
3. **No DB migration coordination**: Flyway runs at Spring boot startup. Incompatible migrations crash-loop the new pod → auto-rollback handles it but is loud.
4. **IaC scan is report-only**: flip `exit-code: "1"` in `iac-scan.yml` after backlog triage.
5. **Smoke test covers Spring services only**: extend to ACA URLs + Vercel post-launch.
6. **Service principal expires**: rotate `AZURE_CREDENTIALS` yearly, or migrate to federated OIDC.
7. **Dev namespace is empty**: needs `k8s/apps/*` manifests applied (Kustomize-friendly later).

## Step-by-step build history

| # | Step | Commit | Doc |
|---|---|---|---|
| 0 | Repo hygiene | `eba9588e` | [step-00](step-00-repo-hygiene.md) |
| 1 | CI scaffolding | `73fb0654` | [step-01](step-01-ci-scaffolding.md) |
| 2 | Image build & push | `fab06082` | [step-02](step-02-image-build-push.md) |
| 3 | Vercel pipeline | `f84d0f16` | [step-03](step-03-vercel-pipeline.md) |
| 4 | K8s deploy | `cddc7185` | [step-04](step-04-k8s-deploy.md) |
| 5 | ACA deploy | `a1a037e2` | [step-05](step-05-aca-deploy.md) |
| 6 | Security gates | `ce364e5d` | [step-06](step-06-security-gates.md) |
| 7 | Multi-env + smoke | `65d28bd8` | [step-07](step-07-multi-env-smoke.md) |
| 8 | Finalize | _this commit_ | [step-08](step-08-finalize.md) |
