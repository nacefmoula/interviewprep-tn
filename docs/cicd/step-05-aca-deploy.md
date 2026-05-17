# Step 5 — Azure Container Apps deploy (AI services)

**Goal:** every successful `Build & Push` auto-deploys the AI services to Azure Container Apps (France Central). Health-gated rollout with auto-rollback on failure.

## File added

`.github/workflows/deploy-aca.yml` — matrix workflow triggered by `Build & Push images` finishing on `main` or `deployment/hybrid-openstack-azure-vercel`.

## What it deploys

| Source folder | ACA app name | Image |
|---|---|---|
| `ai-training-path/` | `ai-training-path` | `docker.io/azizbna/pi-clouddoom-ai-training-path` |
| `kokoro/` | `kokoro` | `docker.io/azizbna/pi-clouddoom-kokoro` |
| `ollama-deploy/` | `ollama` | `docker.io/azizbna/pi-clouddoom-ollama` |

> **`whisper` is intentionally not in the matrix.** It pulls from `fedirz/faster-whisper-server:latest-cpu` — a third-party image we don't build, so there is nothing for our pipeline to deploy. If you ever fork + maintain that image, add a row.

## How it works

1. **`gate` job** — resolves the commit SHA (from `workflow_run` payload or manual input) and computes the `sha-<7-char>` tag.
2. **`deploy` matrix** — one job per ACA app, `fail-fast: false`:
   - `azure/login@v2` with `AZURE_CREDENTIALS`
   - `az containerapp show` — log pre-update state
   - `az containerapp update --image <ref> --revision-suffix sha-<short>` — pushes a new revision
   - **Poll up to 5 minutes** for the new revision to reach `Running` (or `RunningAtMaxScale`). Fails on `Failed` / `Degraded`.
   - **Auto-rollback** on failure: lists prior `Running` revisions, picks the most recent that isn't the broken one, switches 100% traffic back to it via `az containerapp ingress traffic set`.
3. **`deploy-summary`** — aggregates the matrix outcome for branch-protection.

## Required GitHub secrets

| Secret | Source | Sensitive? |
|---|---|---|
| `AZURE_CREDENTIALS` | `az ad sp create-for-rbac --sdk-auth` (full JSON) | **Yes** |
| `AZURE_RESOURCE_GROUP` | Name of the resource group containing the ACA apps | No (but kept as secret per your choice) |

### How to create `AZURE_CREDENTIALS`

```bash
az ad sp create-for-rbac \
  --name "pi-clouddoom-cicd" \
  --role "Contributor" \
  --scopes "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>" \
  --sdk-auth
```

Paste the **entire JSON output** (starts with `{`, multi-line) as the value of the `AZURE_CREDENTIALS` GitHub secret.

> ⚠️ **Scope it to the resource group, not the subscription.** Contributor on a single RG is enough for `az containerapp update`. Subscription-wide is overkill and risky.

### Migration path to OIDC (later, more secure)

Service-principal secrets eventually expire and need rotation. The same workflow already requests `id-token: write`, so swapping to federated credentials is a one-time setup in Entra:
1. Add a Federated Credential to the SP, subject = `repo:Mohamed-Fedi-Hamrouni/Pi-CloudDOOM:ref:refs/heads/main`.
2. Replace `azure/login@v2 → creds:` with explicit `client-id`, `tenant-id`, `subscription-id`.
3. Delete the SP password and the `AZURE_CREDENTIALS` secret.

Deferred from today to avoid blocking the deploy work.

## OpenStack impact

**None.**

## Caveats

- **Single-revision mode**: by default `az containerapp update` activates the new revision immediately. For percentage canary you'd need to set the app to multi-revision mode first (`az containerapp revision set-mode --mode multiple`) and then split traffic — out of scope today.
- **`ollama-deploy` image is ~2 GB**: ACA pull time on first cold start can take 1–2 minutes. The health-poll step waits up to 5 min so this is fine.
- **Env vars / secrets in ACA**: this workflow only updates the image. Existing env vars (like `GROQ_API_KEY` if ACA AI services consume it) stay untouched. Manage them with `az containerapp secret set` or via Bicep later.
- **`whisper`** — see note above.

## Verification (after `AZURE_CREDENTIALS` + `AZURE_RESOURCE_GROUP` are set)

1. Trigger `Build & Push images` manually for the deployment branch.
2. On success → `Deploy — Azure Container Apps` should auto-fire.
3. Watch the per-app job: should show "Revision is healthy" within ~1 min for `ai-training-path` / `kokoro`, ~2 min for `ollama`.
4. Confirm the new revision:
   ```bash
   az containerapp revision list -n ai-training-path -g <rg> -o table
   ```

## Next

Step 6 — security gates (CodeQL, gitleaks, Trivy IaC scan, dependency review).
