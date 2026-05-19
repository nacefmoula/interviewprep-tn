# InterviewPrep TN

> A polyglot **microservices platform** for technical-interview preparation — mock interviews, AI-graded quizzes, gamified training paths, mentorship matching, a community/careers hub, and a learning-resource library — behind a single-sign-on gateway.
>
> Built as the **capstone project for my Cloud Computing & DevOps specialization at ESPRIT**, to practise production-grade DevOps end-to-end on a realistic microservices stack — from OpenStack VMs and Heat templates up through Kubernetes, hardened security, CI/CD pipelines, and AI-powered features.

[![CI](https://github.com/nacefmoula/interviewprep-tn/actions/workflows/ci.yml/badge.svg)](https://github.com/nacefmoula/interviewprep-tn/actions/workflows/ci.yml)
[![CodeQL](https://github.com/nacefmoula/interviewprep-tn/actions/workflows/codeql.yml/badge.svg)](https://github.com/nacefmoula/interviewprep-tn/actions/workflows/codeql.yml)
[![Gitleaks](https://github.com/nacefmoula/interviewprep-tn/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/nacefmoula/interviewprep-tn/actions/workflows/gitleaks.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Java 21](https://img.shields.io/badge/Java-21-orange)
![Spring Boot 3.4](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F)
![Angular 21](https://img.shields.io/badge/Angular-21-DD0031)
![Kubernetes](https://img.shields.io/badge/Kubernetes-OpenStack-326CE5?logo=kubernetes&logoColor=white)

---

## Table of Contents

- [What this project demonstrates](#what-this-project-demonstrates)
- [Features](#features)
- [Architecture](#architecture)
- [Deployment topology](#deployment-topology)
- [Tech stack](#tech-stack)
- [Services](#services)
- [Quick start (local, Docker)](#quick-start-local-docker)
- [Testing](#testing)
- [Quality & Security Engineering](#quality--security-engineering)
- [Project status](#project-status)
- [Deployment](#deployment)
- [Repository layout](#repository-layout)
- [Branch strategy](#branch-strategy)
- [License](#license)

---

## What this project demonstrates

- **Microservices architecture** — 7 independent Spring Boot services + 1 FastAPI AI service, each with its own database, communicating over REST and Kafka events.
- **Production-grade auth** — Keycloak OIDC, JWT resource servers, a canonical role-mapping convention shared across every service, method-level `@PreAuthorize`, and a frontend route guard.
- **Polyglot & AI** — Java 21 / Spring Boot, Python / FastAPI ML path generation, LLM (Groq, Ollama `llama3.2`), Whisper STT and Kokoro TTS for the oral-interview features.
- **Schema discipline** — Flyway-owned schemas with `ddl-auto: validate`; idempotent reconciliation migrations.
- **Hermetic testing** — Testcontainers integration tests (throwaway Postgres/Kafka/Redis) plus infra-free unit tests; green in CI.
- **Security & quality engineering** — a documented, systematic remediation programme I ran on the codebase (see [Quality & Security](#quality--security-engineering)).
- **CI/CD** — GitHub Actions matrix builds, CodeQL, secret scanning (Gitleaks), IaC scanning (Trivy + kube-linter), containerization, and a hybrid OpenStack / Azure / Vercel deployment design.

## Features

- **🎤 Mock interviews** — Oral practice sessions with AI-generated questions, voice answers transcribed by Whisper, LLM-graded feedback, and spoken responses via Kokoro TTS.
- **📚 AI-graded quizzes** — Topic-based quizzes with oral or written answers, evaluated by Groq/Ollama with score breakdowns and explanations.
- **🛤️ Personalized training paths** — ML-generated learning roadmaps (FastAPI `ai-training-path`) that adapt to the user's level and target role, with XP and gamification.
- **🤝 Mentorship matching** — Pairs users with mentors based on profile and goals; mentors manage requests and sessions from a dedicated dashboard.
- **💬 Community & careers hub** — Peer Q&A feed plus a careers wizard that suggests roles and curates job-prep content.
- **📖 Resource library** — Curated articles, videos, and files stored in MinIO / S3, with role-based publishing for admins and mentors.

## Architecture

```mermaid
flowchart TD
    UI["Angular 21 SPA"] -->|OIDC| KC["Keycloak (interviewprep-realm)"]
    UI -->|REST + Bearer JWT| GW["API Ingress"]

    GW --> US["user-service :8081"]
    GW --> IS["interview-service :8082"]
    GW --> TS["training-service :8083"]
    GW --> MS["mentorship-service :8084"]
    GW --> QS["quiz-service :8085"]
    GW --> CS["community-service :8086"]
    GW --> RS["resource-service :8087"]

    IS -. events .-> K[("Kafka")]
    TS -. events .-> K
    US -. events .-> K

    US --- PG[("PostgreSQL 16")]
    IS --- PG
    TS --- PG
    MS --- PG
    QS --- PG
    CS --- PG
    RS --- PG

    QS --> AI["ai-training-path :8001 (FastAPI)"]
    IS --> TTS["Kokoro TTS / Whisper STT"]
    QS --> LLM["Groq / Ollama llama3.2"]
    RS --- OBJ[("MinIO / S3")]
    US --- RD[("Redis")]
```

## Deployment topology

The platform runs on a deliberately hybrid topology — each workload on the platform that fits it best:

```mermaid
flowchart LR
    User([👤 User])

    subgraph Vercel["🌐 Vercel (CDN edge)"]
        FE["Angular 21 SPA"]
    end

    subgraph OS["☁️ OpenStack Kubernetes — piclouddoom"]
        direction TB
        Ingress["NGINX Ingress"]
        Core["Spring Boot services<br/>user · interview · training<br/>mentorship · quiz · community · resource"]
        KCp["Keycloak"]
        Data[("PostgreSQL · Redis<br/>Kafka · MinIO")]
        Ingress --> Core
        Ingress --> KCp
        Core --- Data
    end

    subgraph ACA["☁️ Azure Container Apps"]
        AIsvc["ai-training-path (FastAPI)<br/>Whisper STT · Kokoro TTS · Ollama"]
    end

    DH[("🐳 DockerHub<br/>container registry")]

    User -->|HTTPS| FE
    FE -->|HTTPS API| Ingress
    Core -.->|HTTPS| AIsvc
    DH -. images .-> Core
    DH -. images .-> AIsvc
```

**Why this split?**
- *Stateful + core business logic* lives on **OpenStack Kubernetes** — full control, IaC via Heat, cheap for an academic cluster.
- *GPU-leaning AI services* live on **Azure Container Apps** — scale-to-zero pricing, no GPU on the OpenStack cluster.
- *Static frontend* on **Vercel** — global CDN, zero infra to manage.
- *Container images* are built once in CI and pushed to **DockerHub**, then pulled by both clouds.

## Tech stack

| Layer        | Technology |
| ------------ | ---------- |
| Backend      | Spring Boot 3.4 (Java 21), 7 microservices |
| AI / ML      | FastAPI (`ai-training-path`), Whisper (STT), Kokoro (TTS), Ollama `llama3.2`, Groq |
| Frontend     | Angular 21 (standalone components, typed) |
| Auth         | Keycloak (OIDC, realm `interviewprep-realm`) |
| Data         | PostgreSQL 16, Redis 7, Kafka 7.5, MinIO (S3-compatible) |
| Migrations   | Flyway (pinned 9.22.3 where introduced) |
| Tests        | JUnit 5, Testcontainers, AssertJ |
| CI/CD        | GitHub Actions, CodeQL, Gitleaks, Trivy, kube-linter |
| Deploy       | Docker, Kubernetes (OpenStack), Azure Container Apps, Vercel |

## Services

| Service             | Port  | Purpose                                  |
| ------------------- | ----- | ---------------------------------------- |
| user-service        | 8081  | Users, profiles, RBAC                    |
| interview-service   | 8082  | Mock interview sessions, avatar/TTS      |
| training-service    | 8083  | Training paths, gamification, XP         |
| mentorship-service  | 8084  | Mentorship matching                      |
| quiz-service        | 8085  | Quizzes, oral attempts (Whisper + LLM)   |
| community-service   | 8086  | Community feed, careers wizard           |
| resource-service    | 8087  | Learning-resource library                |
| ai-training-path    | 8001  | ML/LLM-driven training-path generation   |
| frontend (Angular)  | 4200  | Web UI                                   |
| Keycloak            | 8080  | OIDC + realm `interviewprep-realm`       |

## Quick start (local, Docker)

### 1. Prerequisites
- Docker ≥ 24 + Docker Compose ≥ 2.20
- ~6 GB free RAM (full stack ≈ 4–5 GB)
- Java 21 + Maven only if running a service outside Docker

### 2. Configure environment

```bash
git clone https://github.com/nacefmoula/interviewprep-tn.git
cd interviewprep-tn
cp infra/.env.example infra/.env
```

Set the required keys in `infra/.env` (free tiers, ~30 s each):

| Variable            | Required | Powers                                                           | Get one at |
| ------------------- | -------- | ---------------------------------------------------------------- | ---------- |
| `GROQ_API_KEY`      | **Yes**  | `interview-service`, `community-service` (refuse to start blank)  | https://console.groq.com/keys |
| `GOOGLE_AI_API_KEY` | **Yes**  | Training-coach chatbot (UI disables gracefully if blank)          | https://aistudio.google.com/app/apikey |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Optional | Real SMTP (else MailHog catches mail)              | Mailtrap sandbox |

> ⚠️ **Postgres password is baked into the data volume on first `up`.** Pick it before the first `docker compose up`; to reset, `docker compose down -v` (wipes DB data).

### 3. Start the stack

```bash
cd infra
docker compose up -d
docker compose ps      # wait for healthy / Up
```

First boot ≈ 90 s (Keycloak imports the realm).

### 4. Verify

| URL | Shows |
| --- | ----- |
| http://localhost:4200 | Angular frontend |
| http://localhost:8080/admin/ | Keycloak admin console |
| http://localhost:8081/actuator/health | user-service health |
| http://localhost:8025 | MailHog inbox |

### 5. Seed test users (one-time)

```bash
infra/scripts/seed-test-users.sh
```

Creates (idempotent):
- `admin@test.com` / `admin123` — `ROLE_ADMIN`
- `user@test.com` / `user123` — `ROLE_USER`
- `mentor@test.com` / `mentor123` — `ROLE_MENTOR`

## Testing

```bash
# One backend service (unit + Testcontainers integration; needs Docker)
cd user-service && ./mvnw test

# Frontend production build + lint
cd frontend && npm ci && npx ng build --configuration production && npm run lint
```

- **Integration tests** use Testcontainers — a throwaway Postgres/Kafka/Redis per run (`AbstractIntegrationTest`); no shared infra, reproducible anywhere with Docker.
- **Unit tests** (security-critical paths: JWT role mapping, exception handlers) are infra-free and run without Docker.
- CI runs the full suite on every PR — see the badges above.

## Quality & Security Engineering

Beyond shipping features, I ran a **systematic, documented audit-and-remediation programme** on this codebase — the kind of engineering work I want to do professionally. Full backlog, severities, decisions and rationale: [`docs/quality/CODE_AUDIT.md`](docs/quality/CODE_AUDIT.md).

What I tackled:
- **Hardened exception handlers** so 5xx responses no longer leak `ex.getMessage()` / class names.
- **Closed authorization holes** — paid AI endpoints are now authenticated, with ownership checks and admin gating.
- **Added connect/read timeouts + bounded retry** to outbound HTTP, eliminating a thread-starvation DoS risk.
- **Unified JWT role mapping** across every service behind one canonical normalizer, fixing real bugs (double-prefixing, case mismatch).
- **Made Flyway the sole schema owner** with idempotent reconciliation migrations.
- **Removed secrets from source** and reset git history so no credential ever appears in the log.
- **Wrote hermetic regression tests** for every security fix, so the next contributor can't silently undo them.

Where a change was risky — like consolidating already-applied migrations — I **deliberately deferred it with written rationale** rather than ship neatness over safety. Engineering judgment over churn.

## Project status

| Area | Status |
| ---- | ------ |
| Backend builds + tests | ✅ green in CI (all services, Testcontainers) |
| Frontend production build + lint | ✅ green |
| Local one-command run (`docker compose`) | ✅ works |
| Live cloud deployment | ⚙️ designed & scripted; requires your own DockerHub / Vercel / Azure secrets (see Deployment) |

## Deployment

Production deployment is hybrid (design + automation included; secrets are **not** committed):

| Component | Platform |
| --------- | -------- |
| Spring services, Keycloak, Postgres, Redis, Kafka, MinIO | OpenStack Kubernetes (`piclouddoom`) |
| AI services (`ai-training-path`, Whisper, Kokoro, Ollama) | Azure Container Apps |
| Angular frontend | Vercel |
| Container images | DockerHub |

Deploy workflows (`build-and-push`, `deploy-k8s`, `deploy-aca`, `vercel-*`) are **manual (`workflow_dispatch`)** in this repository so CI stays green without credentials; add the documented secrets to enable automation. Pipeline diagram, workflow index and secret matrix: [`docs/cicd/README.md`](docs/cicd/README.md). OpenStack cluster IaC: [`infra/openstack/heat-cluster.yaml`](infra/openstack/heat-cluster.yaml).

## Repository layout

```
.
├── infra/                # docker-compose, Keycloak realm, init SQL, .env.example
├── frontend/             # Angular 21 app
├── {user,interview,training,mentorship,quiz,community,resource}-service/
├── ai-training-path/     # FastAPI ML service
├── kokoro/               # TTS service
├── k8s/                  # Kubernetes manifests + ingress
├── postman/              # API collections
├── docs/                 # CI/CD runbook, CODE_AUDIT, feature docs
└── .github/workflows/    # CI, CodeQL, Gitleaks, IaC scan, deploy (manual)
```

## Branch strategy

- `main` — released, always green.
- `develop` — integration branch for ongoing work.
- `feature/*` — one branch per change → PR into `develop` → merged to `main` on release.

## License

[MIT](LICENSE) © 2026 Nacef Moula
