# Step 7 — Multi-env (dev / prod) + smoke tests

**Goal:** support a separate `piclouddoom-dev` namespace for safe testing, and gate every rollout with end-to-end smoke tests. Failures roll back the entire namespace.

## Files added / updated

| File | Status | Purpose |
|---|---|---|
| `k8s/base/namespace-dev.yaml` | new | `piclouddoom-dev` namespace + smaller `ResourceQuota` (30 pods / 4-8 CPU / 6-12Gi). |
| `k8s/rbac/cicd-deployer-dev.yaml` | new | Same RBAC pattern as prod, scoped to the dev namespace. |
| `scripts/smoke.sh` | new | Health-check curl across the 7 Spring services. Two modes: HTTP (public URL) and in-cluster (kubectl exec). |
| `.github/workflows/deploy-k8s.yml` | **updated** | Adds `environment` input, env-aware kubeconfig selection, in-cluster smoke test, full-namespace rollback on smoke failure. |

## Deploy workflow — what changed

### 1. Environment selection

- `workflow_run` from `Build & Push` → always **prod** (current single-source behavior).
- `workflow_dispatch` → new required input `environment: [dev, prod]`. Operator picks.
- `gate` job resolves both SHA and target namespace based on input:
  - `prod` → `piclouddoom`, uses `KUBECONFIG_PROD`, attaches GitHub Env `production` (URL = `https://api.interviewprep-tn.me`)
  - `dev`  → `piclouddoom-dev`, uses `KUBECONFIG_DEV`, attaches GitHub Env `dev`
- Concurrency group is now `deploy-k8s-${env}` so dev + prod can deploy simultaneously.

### 2. Smoke test job

After the matrix succeeds, a new `smoke` job runs `scripts/smoke.sh` in **in-cluster mode** (`kubectl exec` into each deployment, curls `/actuator/health` on `127.0.0.1:<port>`). No reliance on public DNS — dev doesn't have a public URL yet.

If smoke fails:
```
for svc in user-service ... resource-service; do
  kubectl -n <ns> rollout undo deployment/$svc
done
```
Full namespace rollback. The previous revision's pods come back up; the bad SHA stays in the registry but is no longer pinned anywhere.

### 3. Aggregate gate

`deploy-summary` now requires both `deploy.result` and `smoke.result` to be green.

## smoke.sh design

- **One file, two modes.** Same script your team can run locally to verify any environment.
- **HTTP mode** (default): `curl $BASE_URL/actuator/health` for each service. Tests Cloudflared + Traefik + service. Use for prod monitoring.
- **kubectl-exec mode** (`--kubeconfig=… --namespace=…`): `kubectl exec deploy/<svc> -- curl 127.0.0.1:<port>/actuator/health`. Tests the pod only — bypasses ingress. Used by CI for newly-deployed environments where DNS may not be live yet.
- Services + ports baked into a single array — one line change to add a service.

## OpenStack actions you need to run (one time, **for dev only**)

> Run on `k8s-cp1`, **after** Step 4's prod RBAC is already applied.

```bash
# 1. Create dev namespace + quota
kubectl apply -f k8s/base/namespace-dev.yaml

# 2. Apply dev-namespace RBAC
kubectl apply -f k8s/rbac/cicd-deployer-dev.yaml

# 3. Mint dev kubeconfig
NAMESPACE=piclouddoom-dev bash scripts/extract-kubeconfig.sh \
  > /tmp/kubeconfig-dev.yaml

# 4. Paste contents of /tmp/kubeconfig-dev.yaml into GitHub secret KUBECONFIG_DEV
# 5. Clean up
shred -u /tmp/kubeconfig-dev.yaml
```

**Important:** the dev namespace is empty for now — no Deployments live there yet. To actually deploy to dev, you'd need to copy your `k8s/apps/*.yaml` manifests into the new namespace (or, better, use Kustomize overlays). For today, dev exists as a target for the pipeline to use as soon as you populate it.

## GitHub Environments — configure these in repo settings

| Environment | Required reviewers | Used by |
|---|---|---|
| `production` | 1 reviewer (recommended) | `deploy-k8s.yml` (prod path), `vercel-prod.yml`, `deploy-aca.yml` |
| `dev` | none (auto-approve) | `deploy-k8s.yml` (dev path) |

Set via: Repo → Settings → Environments → New environment. The `vercel-prod.yml` and `deploy-aca.yml` workflows already reference `production` — adding reviewers there is a one-click change at any time.

## Required GitHub secrets (cumulative across all steps)

| Secret | Step added |
|---|---|
| `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN` | 2 |
| `VERCEL_TOKEN` | 3 |
| `KUBECONFIG_PROD` | 4 |
| `AZURE_CREDENTIALS` + `AZURE_RESOURCE_GROUP` | 5 |
| `KUBECONFIG_DEV` | **7** |

## Verification

1. Trigger `Deploy — OpenStack K8s` manually with `environment: dev` (once the dev namespace has Deployments).
2. Watch the workflow: `gate` resolves to `piclouddoom-dev`, matrix rolls each service, then smoke job runs `kubectl exec` into each pod.
3. Smoke output appears in step log: `✓ user-service (in-cluster :8081/actuator/health) → 200`.

## Caveats

- **Dev namespace starts empty.** Populating it is outside this step's scope. Quick path: `kubectl apply -k k8s/ -n piclouddoom-dev` once you Kustomize the manifests (post-launch task).
- **No DB/Kafka in dev** by default — those are heavy. Easiest: dev services point at prod infra ConfigMaps (no isolation) or you run a lightweight in-cluster Postgres for dev. Decide post-launch.
- **Smoke test currently checks only Spring services.** Frontend (Vercel) is smoke-checked by its own workflow. AI services (ACA) by their own. We can extend `smoke.sh` to hit ACA URLs later.

## Next

Step 8 — finalize docs, top-level CI/CD README, runbook, baseline tag.
