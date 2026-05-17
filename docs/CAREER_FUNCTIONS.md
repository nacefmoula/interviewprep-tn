# Career Functions — Complete Recap

## Overview

The career feature is embedded in the `community-service` (port `8086`) and the Angular frontend. It provides a 5-step wizard that captures a user's career profile, scores jobs against that profile, and returns personalized recommendations with a skills gap analysis.

---

## API Endpoints

**Base URL:** `/api/community/career` — all endpoints require a JWT.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/wizard/save` | Save wizard progress (partial) |
| `POST` | `/wizard/complete` | Complete wizard & generate recommendations |
| `GET` | `/wizard/progress` | Get saved wizard data for current user |
| `GET` | `/recommendations` | Get stored recommendations |
| `POST` | `/jobs/submit` | Submit a job to the catalog |

---

## Backend — Java / Spring Boot

### `CareerWizardController`
`community-service/.../controller/CareerWizardController.java`

| Method | Signature | Description |
|--------|-----------|-------------|
| `saveWizardProgress` | `POST /wizard/save` | Upserts wizard row for the authenticated user |
| `completeWizard` | `POST /wizard/complete` | Marks wizard complete, triggers recommendation generation |
| `getWizardProgress` | `GET /wizard/progress` | Returns saved wizard data |
| `getRecommendations` | `GET /recommendations` | Returns top-10 job matches + skills gap |
| `submitJob` | `POST /jobs/submit` | Adds a user-submitted job to `job_catalog` |

---

### `CareerService`
`community-service/.../service/CareerService.java`

| Method | Return | Description |
|--------|--------|-------------|
| `saveOrUpdateWizard(keycloakId, request)` | `CareerWizardResponse` | Creates or updates wizard row |
| `completeWizard(keycloakId, request)` | `CareerRecommendationResult` | Saves, marks `completed=true`, runs scoring |
| `getWizardProgress(keycloakId)` | `Optional<CareerWizardResponse>` | Fetches saved progress |
| `generateRecommendations(keycloakId)` | `CareerRecommendationResult` | Scores all active jobs, persists top 10 |
| `getRecommendations(keycloakId)` | `CareerRecommendationResult` | Returns stored recommendations + skills gap |
| `submitJob(keycloakId, submission)` | `JobCatalog` | Creates a `USER_SUBMITTED` job entry |

**Dependencies:** `CareerWizardRepository`, `JobCatalogRepository`, `JobRecommendationRepository`, `JobRecommendationEngine`, `SkillsGapService`

---

### `JobRecommendationEngine`
`community-service/.../service/JobRecommendationEngine.java`

Scores a single job against a user profile on a 0–100 scale:

| Criterion | Max Points |
|-----------|-----------|
| Target role match | 30 |
| Skills overlap | 25 |
| Industry match | 20 |
| Career level match | 15 |
| Work type match | 10 |

| Method | Description |
|--------|-------------|
| `score(profile, job): int` | Returns 0–100 match score |
| `reasons(profile, job, score): List<String>` | Human-readable match reasons |

---

### `SkillsGapService`
`community-service/.../service/SkillsGapService.java`

Identifies missing skills by comparing the user's skill set against predefined role skill maps.

**Predefined role → skills map:**

| Role | Required Skills |
|------|----------------|
| Backend Engineer | Java, Spring Boot, Docker, Kubernetes, PostgreSQL, REST API, Kafka |
| Frontend Developer | Angular, TypeScript, RxJS, HTML, CSS, Git, Jest |
| DevOps Engineer | Docker, Kubernetes, Jenkins, Terraform, AWS, Linux, Git |
| Data Scientist | Python, Machine Learning, Pandas, SQL, TensorFlow, Statistics |
| Data Engineer | Python, Spark, Kafka, Airflow, SQL, Docker, ETL |
| Mobile Developer | React Native, Flutter, TypeScript, REST API, Git |
| Fullstack Developer | Angular, Spring Boot, PostgreSQL, Docker, TypeScript, REST API |
| Cloud Engineer | AWS, Azure, Terraform, Docker, Kubernetes, Linux |

| Method | Description |
|--------|-------------|
| `computeGap(profile): List<String>` | Returns up to 8 missing skills for target roles |
| `findBestMatchingRole(targetRole): String` | Fuzzy-matches user input to a predefined role key |

---

### `ExternalJobFetcherService`
`community-service/.../service/ExternalJobFetcherService.java`

| Method | Description |
|--------|-------------|
| `fetchAndStoreJobs()` | Scheduled daily at `0 0 3 * * *` — currently a stub (Arbeitnow API) |
| `fetchNow(): int` | Manual trigger for testing, returns 0 |
| `inferIndustry(tags): String` | Maps tag list to industry string (Technology / Finance) |

---

## Data Models

### `CareerWizardResponse` — table `career_wizard_responses`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `Long` | PK |
| `userKeycloakId` | `String` | UNIQUE, NOT NULL |
| `currentRole` | `String` | VARCHAR 100 |
| `targetRoles` | `String` | Comma-separated, TEXT |
| `experienceYears` | `Integer` | |
| `careerLevel` | `String` | ENTRY / MID / SENIOR / LEAD |
| `skills` | `String` | Comma-separated, TEXT |
| `targetIndustries` | `String` | Comma-separated, TEXT |
| `workType` | `String` | REMOTE / HYBRID / ONSITE / ANY |
| `availability` | `String` | IMMEDIATE / ONE_MONTH / THREE_MONTHS |
| `salaryMin` | `Integer` | optional |
| `salaryMax` | `Integer` | optional |
| `completed` | `Boolean` | default false |
| `createdAt` / `updatedAt` | `LocalDateTime` | |

Helper methods: `getSkillList()`, `getTargetRoleList()`, `getTargetIndustryList()`

---

### `JobCatalog` — table `job_catalog`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `Long` | PK |
| `title` | `String` | VARCHAR 200, NOT NULL |
| `company` | `String` | VARCHAR 200 |
| `location` | `String` | VARCHAR 150 |
| `description` | `String` | TEXT |
| `requiredSkills` | `String` | Comma-separated, TEXT |
| `industry` | `String` | VARCHAR 100 |
| `careerLevel` | `String` | ENTRY / MID / SENIOR / LEAD |
| `workType` | `String` | REMOTE / HYBRID / ONSITE |
| `salaryMin` / `salaryMax` | `Integer` | optional |
| `jobUrl` | `String` | VARCHAR 500 |
| `source` | `String` | STATIC / USER_SUBMITTED |
| `submittedBy` | `String` | Keycloak ID |
| `active` | `Boolean` | default true |
| `createdAt` | `LocalDateTime` | |

Helper: `getRequiredSkillList()`
Seed data: **26 pre-populated jobs** (V7 migration — Backend, Frontend, DevOps, Data, Cloud, Mobile, QA, Security, PM roles)

---

### `JobRecommendation` — table `job_recommendations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `Long` | PK |
| `userKeycloakId` | `String` | NOT NULL |
| `job` | `JobCatalog` | Many-to-one, EAGER |
| `matchScore` | `Integer` | 0–100, NOT NULL |
| `matchReasons` | `String` | Comma-separated, TEXT |
| `generatedAt` | `LocalDateTime` | |

Helper: `getMatchReasonList()`

---

## DTOs

| DTO | Key Fields |
|-----|-----------|
| `CareerWizardRequest` | `currentRole`, `targetRoles[]`, `experienceYears`, `careerLevel`, `skills[]`, `targetIndustries[]`, `workType`, `availability`, `salaryMin?`, `salaryMax?` |
| `CareerRecommendationResult` | `topJobs: JobMatchDTO[]`, `skillsGap: String[]`, `peopleToFollow`, `postsToRead`, `profile`, `generatedAt` |
| `JobMatchDTO` | `job: JobCatalog`, `matchScore`, `matchReasons[]` |
| `JobSubmission` | `title`, `company`, `location`, `requiredSkills[]`, `industry`, `careerLevel`, `workType`, `salaryMin?`, `salaryMax?`, `jobUrl?` |

---

## Repositories

| Repository | Notable Methods |
|-----------|----------------|
| `CareerWizardRepository` | `findByUserKeycloakId`, `existsByUserKeycloakId`, `findByCompletedTrue` |
| `JobCatalogRepository` | `findByActiveTrue`, `findByActiveTrueAndSource`, `findByActiveTrueAndIndustryContainingIgnoreCase`, `findByActiveTrueAndSubmittedBy(pageable)`, `existsByJobUrl` |
| `JobRecommendationRepository` | `findByUserKeycloakIdOrderByMatchScoreDesc`, `deleteByUserKeycloakId` |

---

## Database Migrations

| Migration | Description |
|-----------|-------------|
| `V4__career_wizard_responses.sql` | Creates `career_wizard_responses` table + 2 indexes |
| `V5__job_catalog.sql` | Creates `job_catalog` table + 4 indexes |
| `V6__job_recommendations.sql` | Creates `job_recommendations` table + 2 indexes |
| `V7__job_catalog_seed_data.sql` | Inserts 26 seed job listings |

---

## Frontend — Angular

### `CareerWizardComponent`
`frontend/src/app/pages/community/career-wizard/career-wizard.component.ts`
Route: `/community/career`

**5-Step Wizard Flow:**

| Step | Name | Fields |
|------|------|--------|
| 1 | Who are you? | `currentRole`, `experienceYears`, `careerLevel` |
| 2 | Where do you want to go? | `targetRoles` (max 3) |
| 3 | Your Skills | `skills[]` |
| 4 | Work Preferences | `workType`, `targetIndustries`, `availability`, `salaryMin`, `salaryMax` |
| 5 | Review & Confirm | Read-only summary |

**Key methods:**

| Method | Description |
|--------|-------------|
| `nextStep()` | Advances step; calls `saveWizardProgress` for steps 1–4 |
| `prevStep()` | Goes back one step |
| `submitWizard()` | Calls `completeWizard`, shows results screen |
| `addSkill(skill)` / `removeSkill(skill)` | Manages skills array |
| `addTargetRole(role)` / `removeTargetRole(role)` | Manages roles array (max 3) |
| `toggleIndustry(industry)` | Toggles industry in array |
| `incrementExp()` / `decrementExp()` | Adjusts experience (0–20) |
| `isStepValid(): boolean` | Validates current step before advancing |
| `openJobUrl(url)` | Opens job link in new tab |
| `retakeWizard()` | Resets form and restarts |
| `backToCommunity()` | Navigates to `/community` |

**Results screen shows:** top-10 job matches (score + reasons) + skills gap list.

---

### `CommunityApiService` — Career Methods
`frontend/src/app/core/services/community-api.service.ts`

| Method | HTTP | Description |
|--------|------|-------------|
| `saveWizardProgress(data)` | `POST /wizard/save` | Auto-save on step advance |
| `completeWizard(data)` | `POST /wizard/complete` | Final submit |
| `getWizardProgress()` | `GET /wizard/progress` | Load existing progress |
| `getRecommendations()` | `GET /recommendations` | Fetch stored results |
| `submitJob(job)` | `POST /jobs/submit` | Community job submission |

---

## Infrastructure

- **Service port:** `8086`
- **Database:** `communitydb` (PostgreSQL, dedicated container)
- **Network:** `userservice-network`
- **External job fetch:** Arbeitnow API, scheduled daily at 03:00 — currently stubbed (returns 0 jobs)
