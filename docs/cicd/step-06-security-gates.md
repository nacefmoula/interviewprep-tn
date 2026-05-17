# Step 6 — Security gates

**Goal:** every PR is scanned for code-level vulnerabilities, leaked secrets, and IaC misconfigurations. Findings surface in the repo's **Security → Code scanning alerts** tab.

## Files added

| File | What it scans | When |
|---|---|---|
| `.github/workflows/codeql.yml` | Java, JS/TS, Python, GitHub Actions definitions | PR + push + Monday 05:00 UTC |
| `.github/workflows/iac-scan.yml` | `k8s/**`, `infra/**` via Trivy config + kube-linter | PR + push on those paths |
| `.github/workflows/gitleaks.yml` | Full git history for secrets/credentials | PR + push + Monday 05:30 UTC |

## CodeQL details

- 4 parallel analyses: `java-kotlin`, `javascript-typescript`, `python`, `actions`.
- Java uses **autobuild** with `user-service/` as the representative module (Java 21, has tests). For deeper Maven coverage we can extend later to build all 7 services.
- Queries: `security-extended,security-and-quality` — broader than the default.
- Findings show up under **Security → Code scanning** in GitHub; reviewers can dismiss false positives there.

## IaC scan details

Two tools because they catch different things:

| Tool | Strength |
|---|---|
| **Trivy `config`** | Kubernetes anti-patterns (missing resource limits, `:latest` tags, privileged containers, hostPath mounts), Heat / Terraform / Dockerfile findings |
| **kube-linter** | Production-readiness checks (liveness/readiness probes, replica count, anti-affinity, PodDisruptionBudgets) |

Both upload SARIF to GH code-scanning under their own categories.

> **Day-1 posture: report-only.** `exit-code: "0"` on Trivy and `continue-on-error: true` on kube-linter. We surface findings without blocking PRs while you triage the initial backlog (single-replica deployments, hard-coded `latest` tags on infra images, etc.). Flip `exit-code` to `"1"` later once findings are clean.

## Gitleaks details

- Uses `fetch-depth: 0` so it scans the **entire commit history** — not just HEAD. Catches secrets that landed in older commits.
- Findings auto-uploaded as an artifact + step summary.
- Default ruleset is broad; if it generates noise on `infra/.env.example`, add a `.gitleaks.toml` allowlist later.

## What this catches now

| Class | Example finding |
|---|---|
| CodeQL | SQL injection, XSS, hard-coded credential, insecure deserialization, log forging |
| Trivy config (k8s) | Single-replica Deployment, no resource limits, image with `:fixed` mutable tag, runAsNonRoot missing |
| Trivy config (Heat) | Security group rule `0.0.0.0/0` on port 6443 |
| kube-linter | Missing liveness/readiness probes, missing PodDisruptionBudget |
| Gitleaks | AWS/Azure keys committed, hard-coded `GROQ_API_KEY`, etc. |

## Required GitHub secrets

**None.** All three workflows use the auto-provisioned `GITHUB_TOKEN`. CodeQL needs `security-events: write` (declared in each file).

## OpenStack impact

**None.**

## Caveats

- **CodeQL ≠ free for private repos** on some GitHub plans. Org admins should confirm CodeQL is enabled under **Settings → Code security and analysis**.
- **First run = baseline of findings**: expect 10–50 alerts on the first scan. Don't panic — triage over a week.
- **Java autobuild on `user-service` only**: CodeQL doesn't see the other 6 Spring services. We can either (a) extend the matrix per service (slow) or (b) build a tiny aggregator `pom.xml` later. Deferred.

## Verification

After committing:
1. Open the repo's **Security** tab → **Code scanning alerts**. Within ~15 min of the first push you should see CodeQL + Trivy + kube-linter alert lists populating.
2. Open a test PR with an obvious leak (e.g. `password = "supersecret"` in a `.java` file) — Gitleaks should flag it within 1 min.

## Next

Step 7 — multi-env (dev/prod) namespaces + smoke tests.
