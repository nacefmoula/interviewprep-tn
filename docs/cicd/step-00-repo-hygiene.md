# Step 0 — Repository hygiene

**Goal:** establish a clean baseline before adding CI/CD workflows. No behavior change to running services.

## Changes applied

### New / committed files
- `ollama-deploy/Dockerfile`, `ollama-deploy/start.sh` — bakes `llama3.2:3b` into an Ollama image for Azure Container Apps. Previously untracked.
- `ai-training-path/.dockerignore` — previously untracked.
- `interview-service/.dockerignore`, `mentorship-service/.dockerignore`, `quiz-service/.dockerignore`, `community-service/.dockerignore`, `resource-service/.dockerignore` — Maven-aware ignore list copied from `user-service/.dockerignore`. Excludes `target/`, `.mvn/`, `mvnw*`, IDE folders, logs, `.DS_Store`. Reduces Docker build context.

### Moved into the repo
- `infra/openstack/heat-cluster.yaml` — copied from a local-only file (`~/Downloads/nqcef.txt`). 845 lines. Provisions the production cluster on OpenStack: 1 control-plane + 4 workers across `compute2nacef`, `compute3ayoub`, `compute1yass`; boot-from-volume; Kubernetes 1.29.15; Calico v3.27.2 (VXLAN); cloud-init systemd timer that runs an external Ansible playbook (`med-aziz-benamor/ansible-k8s`) on cp1.

### New directories
- `infra/openstack/` — home for OpenStack IaC (Heat / future Terraform).
- `docs/cicd/` — pipeline documentation, one file per step.

## OpenStack impact

None. No stack updates, no kubectl actions.

## Why this matters

- The Heat template is the single most important IaC asset for the cluster. It now lives in git history, not on one laptop's `Downloads/`.
- Missing `.dockerignore`s were shipping `target/` (~100 MB of build artifacts) into Docker build context on each `docker build`. Image builds in Step 2 will be measurably faster.
- `ollama-deploy/` was referenced by Azure Container Apps but never committed → no way for anyone else to rebuild the AI plane.

## Verification

```bash
git status              # should show all listed files as staged / committed
ls infra/openstack/     # heat-cluster.yaml
ls docs/cicd/           # step-00-repo-hygiene.md
```

## Next

Step 1 — CI scaffolding: workflows that lint/test/build each service on PR.
