# Azure SP creation — blocked on tenant admin permission

**Status:** open as of 2026-05-11. Pipeline ships without auto-ACA today.

## What's blocked

```
$ az ad sp create-for-rbac --name "pi-clouddoom-cicd" \
    --role "Contributor" \
    --scopes "/subscriptions/e8928eeb-5efe-4a65-b301-e5c99e492dee/resourceGroups/rg-piclouddoom" \
    --sdk-auth

Insufficient privileges to complete the operation.
```

The `esprit.tn` Entra ID tenant restricts non-admin users from registering applications. Without that, neither classic SP+secret nor federated OIDC works for GitHub Actions auth.

## What still works today

- ✅ K8s deploys to OpenStack (`deploy-k8s.yml`)
- ✅ Image builds + push to DockerHub (`build-and-push.yml`)
- ✅ Vercel preview + prod (`vercel-*.yml`)
- ✅ Security gates (CodeQL, Trivy, Gitleaks)
- ✅ Manual ACA deploys from your laptop via `scripts/deploy-aca.sh`

## Workaround

`.github/workflows/deploy-aca.yml` had its `workflow_run:` trigger commented out — it no longer fires automatically after each successful build. Manual `workflow_dispatch` is still present but will fail without `AZURE_CREDENTIALS`. **In practice you trigger ACA deploys from your laptop.**

```bash
# Deploy all 3 AI services with the latest local git HEAD's image
bash scripts/deploy-aca.sh

# Deploy a specific commit
bash scripts/deploy-aca.sh 5947c8ab

# Deploy just one service
bash scripts/deploy-aca.sh 5947c8ab kokoro
```

The script:
1. Looks up the image at `docker.io/azizbna/pi-clouddoom-<svc>:sha-<7chars>`
2. Runs `az containerapp update --image … --revision-suffix sha-<7chars>` for each of `ai-training-path`, `kokoro`, `ollama`
3. Polls `runningState` up to 5 min, fails on `Failed`/`Degraded`

## How to unblock the auto-deploy path

### Option A — ask the esprit.tn Entra ID admin (proper fix)

Email/Teams the tenant admin asking for **one** of these, in order of preference:

1. **"Application Developer" Entra ID role** assigned to `MohammedAziz.BenAmor@esprit.tn` — lets you create your own SPs going forward. Smallest possible blast radius.
2. **An admin-created service principal** named `pi-clouddoom-cicd` with `Contributor` on resource group `rg-piclouddoom`, JSON output sent to you securely.

Either gets you the `AZURE_CREDENTIALS` JSON you need.

### Option B — federated OIDC (more secure, same permission requirement)

Once you have permission, prefer federated credentials over a long-lived secret:

```bash
APP_ID=$(az ad app create --display-name pi-clouddoom-cicd --query appId -o tsv)
az ad sp create --id "$APP_ID"
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/e8928eeb-5efe-4a65-b301-e5c99e492dee/resourceGroups/rg-piclouddoom"

# Federated credential for main branch
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:Mohamed-Fedi-Hamrouni/Pi-CloudDOOM:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

Then in GitHub Secrets set `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (no secret) and update `deploy-aca.yml` to use them via `azure/login@v2`.

## Re-enabling the auto-deploy workflow

When `AZURE_CREDENTIALS` lands:

1. Edit `.github/workflows/deploy-aca.yml`
2. Replace the `on:` block with the original (kept in a comment at the top of the file)
3. Commit
4. Next successful `Build & Push` will auto-fire ACA deploys

## What I do for now

I treat ACA as "deploy-on-demand from my laptop" until the admin responds. AI services on ACA keep running their current revisions; new images sit in DockerHub waiting until I run `scripts/deploy-aca.sh`.
