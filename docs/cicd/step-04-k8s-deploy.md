# Step 4 — Deploy backend images to OpenStack Kubernetes

**Goal:** every successful `Build & Push` on `main` (or the current `deployment/hybrid-openstack-azure-vercel` branch) auto-deploys the 7 Spring services to the cluster by pinning to immutable `sha-<short>` image tags. Auto-rollback on failed rollout.

## Files added

| File | Purpose |
|---|---|
| `k8s/rbac/cicd-deployer.yaml` | Namespace-scoped `ServiceAccount` + `Role` + `RoleBinding` + long-lived token `Secret` (K8s 1.24+ no longer auto-creates SA tokens). |
| `scripts/extract-kubeconfig.sh` | Run on `k8s-cp1` once. Pulls the SA token, CA cert, and API server URL from the cluster and prints a ready-to-paste kubeconfig. |
| `.github/workflows/deploy-k8s.yml` | Matrix deploy workflow: triggered by `Build & Push` success (or manual `workflow_dispatch`). |

## RBAC scope (defense in depth)

The `cicd-deployer` SA is **namespace-scoped to `piclouddoom` only**. It can:
- `get / list / watch / patch / update` Deployments + ReplicaSets
- `get / list / watch` Pods (+ logs, status)
- `get / list` Services, endpoints, ConfigMaps
- `get / list / watch` Events

It **cannot** create secrets, modify RBAC, touch other namespaces, or read across the cluster. Any compromise of `KUBECONFIG_PROD` is limited to "redeploy app images in piclouddoom" — no exfiltration of credentials or escalation.

## Deploy workflow behaviour

1. **Trigger** — `workflow_run` on the `Build & Push images` workflow finishing successfully on `main` or `deployment/hybrid-openstack-azure-vercel`. Also exposed via `workflow_dispatch` with optional SHA + single-service inputs.
2. **Resolve SHA** — uses `github.event.workflow_run.head_sha` (auto) or the manual input. Computes `sha-<7-char>` to match the tag pushed in Step 2.
3. **Matrix over 7 Spring services** — each runs independently with `fail-fast: false`.
4. **`kubectl set image deployment/<svc> <svc>=docker.io/azizbna/pi-clouddoom-<svc>:sha-<short>`**.
5. **`kubectl rollout status`** with 5 min timeout. On failure: dumps `describe`, `get pods`, and the last 80 log lines per pod.
6. **Auto-rollback** — if rollout fails, runs `kubectl rollout undo deployment/<svc>`, then re-waits up to 3 min.
7. **Per-service summary** — image pinned + current pod state into the GitHub Actions Step Summary.

## OpenStack actions YOU need to run (one time)

> **On `k8s-cp1`** (control-plane host with kubectl access)

### 1. Apply the RBAC manifest

```bash
# From a checkout of the repo on cp1, or scp the file across:
kubectl apply -f k8s/rbac/cicd-deployer.yaml
```

Verify:
```bash
kubectl -n piclouddoom get sa,secret,role,rolebinding | grep cicd-deployer
```
Expected: 1 sa, 1 secret, 1 role, 1 rolebinding.

### 2. Extract the kubeconfig

```bash
bash scripts/extract-kubeconfig.sh > /tmp/kubeconfig-prod.yaml
cat /tmp/kubeconfig-prod.yaml             # quick sanity check
```

The script reads the API server URL from your existing kubeconfig. **Verify the `server:` field is reachable from GitHub Actions runners** — usually that's the cp1 floating IP `https://<FIP>:6443`. If your cluster only listens internally, you need to either:
- expose the API via a public LoadBalancer + NetworkPolicy, or
- use a self-hosted runner inside the cluster (deferred to a follow-up day).

To override:
```bash
API_SERVER=https://<your-public-api-url>:6443 bash scripts/extract-kubeconfig.sh > /tmp/kubeconfig-prod.yaml
```

### 3. Paste into GitHub Actions secret

GitHub → Repo Settings → Secrets and variables → Actions → New repository secret:
- **Name:** `KUBECONFIG_PROD`
- **Value:** full contents of `/tmp/kubeconfig-prod.yaml`

### 4. Clean up the local file

```bash
shred -u /tmp/kubeconfig-prod.yaml || rm -f /tmp/kubeconfig-prod.yaml
```

## Required GitHub secret

| Secret | Source |
|---|---|
| `KUBECONFIG_PROD` | Output of `scripts/extract-kubeconfig.sh` after applying the RBAC manifest |

## Caveats / known limitations

- **API server reachability**: GitHub-hosted runners pull from public IP ranges. The cluster API at `https://<cp1-FIP>:6443` must accept those connections (the Heat template's security group already allows `6443/tcp` from `admin_cidr` which defaults to `0.0.0.0/0` — verify it's still permissive).
- **Single replica per app**: rollout success is binary (1 pod up = success). No canary/blue-green today. Add Argo Rollouts post-launch.
- **No DB migration coordination**: Flyway runs at Spring startup. If a deploy involves an incompatible migration, the new pod will fail to start and we'll auto-rollback. Schema changes still need human review.
- **`workflow_run` quirks**: runs against the *default branch's* version of the deploy workflow file. Once this lands on the deployment branch it will auto-trigger; once merged to `main` it becomes the canonical version.

## Verification (after secret is set + branch pushed)

1. Trigger a manual build: Actions → "Build & Push images" → Run workflow → branch `deployment/hybrid-openstack-azure-vercel`.
2. When it succeeds, Actions → "Deploy — OpenStack K8s" should auto-fire.
3. Check that 7 jobs (`rollout-user-service`, …) run in parallel and all go green.
4. Spot-check:
   ```bash
   kubectl -n piclouddoom get deploy -o wide
   # IMAGE column should show docker.io/azizbna/pi-clouddoom-<svc>:sha-<short>
   ```

## Next

Step 5 — Azure Container Apps deploys for AI services (`ai-training-path`, `kokoro`, `ollama`). Needs `AZURE_CREDENTIALS` secret.
