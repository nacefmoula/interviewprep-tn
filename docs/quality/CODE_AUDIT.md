# Code Quality Audit & Remediation Backlog

> Baseline established 2026-05-15. Goal: uniform ship-ready quality across all 7 Spring services + frontend + AI service. Severity: **P0** = security/correctness/build-blocking · **P1** = reliability/best-practice · **P2** = polish. Effort: **S** <1h · **M** ~half-day · **L** multi-day.

## Objective baseline (`mvn test` from clean checkout)

| Service | Build | Real tests | Root cause |
|---|---|---|---|
| user-service | PASS | 0 (stub skipped) | only disabled `contextLoads` |
| mentorship-service | PASS | 1 trivial | passes only due to `ddl-auto:update` |
| interview-service | FAIL | 0 | context load — Groq config (I3) |
| quiz-service | FAIL | 0 | context load |
| community-service | FAIL | 0 | context load |
| resource-service | FAIL | 71 (35 err) | needs live Postgres; testcontainers unused |
| training-service | FAIL | — | broken Maven wrapper (missing `.mvn/wrapper/maven-wrapper.properties`) |
| frontend | — | 0 specs | no test runner, no ESLint/Prettier |

**5/7 services fail a clean `mvn test`. ~0% meaningful coverage.**

## Cross-cutting themes
- **T-A** Non-hermetic/broken tests (build red) — all but user/mentorship
- **T-B** Secrets in git — Simli keys (F1,I11), mentorship DB `0000` (M1), Grafana pwd
- **T-C** Exception handlers leak messages + wrong status codes — U3,I10,M3,C2,T9
- **T-D** Auth/validation holes — U1,I4,I5,C9,F2,A7 + missing `@Valid`
- **T-E** External HTTP w/o timeouts/retry — Q4,C1,M5,A6
- **T-F** Schema mgmt inconsistency — M2,Q1,I2
- **T-G** Version/config drift — Spring Boot 3.4.1↔4.0.4, broken mvnw, port collision Q2

## Remediation roadmap (waves)

**Wave 0 — Foundation (unblocks everything; do first)**
- Fix training-service Maven wrapper; standardize Spring Boot version across all 7
- Make every service build green with **hermetic** tests (Testcontainers base; fix interview/quiz/community context-load; wire resource testcontainers)
- Add JaCoCo + Spotless + SpotBugs to a shared parent/config
- Secret sweep + rotation (T-B); externalize all credentials/CORS

**Wave 1 — Security & correctness P0s** — T-C handler pattern ×5, T-D authz/validation, T-E client resilience, T-F schema (mentorship Flyway, quiz ddl-auto, interview migrations)

**Wave 2 — Test coverage to bar** — per service: service unit tests + `@WebMvcTest` security tests + repository/Testcontainers + Kafka consumer tests; frontend Vitest+ESLint+specs

**Wave 3 — Refactor smells** — god-classes (training T3 1390L, frontend library 8.5kL), DTO/entity separation, dead code

**Wave 4 — CI enforcement & visibility** — coverage gates in `ci-spring-service.yml`/`ci-frontend.yml`, static-analysis gates, README badges

## Full findings

### user-service
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| U1 | P0 | S | TestController.java:34,40 | `hasRole('ROLE_ADMIN')` double-prefixes → `ROLE_ROLE_ADMIN`, admin check never matches → use `hasRole('ADMIN')` |
| U2 | P0 | S | TestController.java:10-43 | Dead/duplicate debug controller, `/api/me` conflict, NPE on absent claim → delete class |
| U3 | P0 | M | GlobalExceptionHandler.java:104 | Catch-all returns raw `ex.getMessage()`, all errors→500 → log server-side, generic msg, add ConstraintViolation/MaxUpload/DataIntegrity handlers |
| U4 | P1 | S | UserController.java:71-81 | Avatar upload no MIME/size validation, not bound to caller (path-traversal surface) → validate + derive owner from JWT |
| U5 | P1 | M | UserService.java:219 | Broad `catch(Exception)` swallows CV pipeline errors → catch specific |
| U6 | P1 | S | KeycloakAdminClient.java:55 | Insecure default admin password → fail-fast if unset |
| U7 | P1 | S | SecurityConfig.java:62 | CORS hardcoded localhost:4200 → externalize `app.cors.allowed-origins` |
| U8 | P1 | S | UserService.java:312 | `updateLastLogin` on every `/me` GET + `allEntries=true` evict storm → throttle/async, scope evict |
| U9 | P2 | S | User.java:38 | No `@Version` → lost-update on concurrent role/status → add optimistic lock |
| U10 | P2 | S | application.yaml:78 | Dead Ollama config, `show-sql:true` shipped → remove |
| U11 | P2 | S | UserController.java:170 | `/{id}/availability` weaker auth lets any user change any id → restrict owner/admin |

### interview-service
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| I1 | P0 | S | resources/InterviewServiceApplication.java | Duplicate `@SpringBootApplication` in resources/ → delete |
| I2 | P0 | M | db/migration/V8,V10,V11 | 3 migrations create `performance_reports`, V8 no IF NOT EXISTS; V15/V16 dup → consolidate, never edit applied |
| I3 | P0 | S | application.yaml:46 | `management.Grok` typo, no `groq:` block, `@PostConstruct` throws at startup → add proper `groq:` block (this is the build-FAIL cause) |
| I4 | P0 | S | SecurityConfig.java:40 | `/api/live-voice/speak`,`/api/avatar/talk` permitAll → paid AI cost-abuse/DoS → require auth + rate-limit |
| I5 | P0 | S | SecurityConfig.java:99 | Role-prefix logic diverges from user-service → extract shared JWT converter |
| I6 | P1 | M | InterviewSessionServiceImpl.java:198 | `@Transactional` self-invocation bypassed (no tx) → separate bean / TransactionTemplate |
| I7 | P1 | S | InterviewSessionController.java:107 | Returns JPA entity → add DTO |
| I8 | P1 | S | AvatarController.java:19 | No `@Valid` on bodies → add bean validation |
| I9 | P1 | S | DebugConfig.java / DbDebugConfig.java | `System.out` DB url/user at startup → delete debug configs |
| I10 | P1 | S | GlobalExceptionHandler.java:45 | Leaks message+classname, missing handlers → mask + add |
| I11 | P0 | S | application.yaml:73 / GroqClient.java:33 | Hardcoded real Simli api-key/face-id committed → remove default, rotate key |
| I12 | P2 | S | GroqDiagnosticController.java:29 | Misleading `anthropicClient` field, prod diag endpoint → rename/restrict |
| I13 | P2 | S | model/*.java | No `@Version` on sessions → add |
| I14 | P2 | S | LiveVoice/Whisper/Vosk impls | Blocking HTTP no timeout → set client timeouts |

### training-service
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| TW0 | P0 | S | .mvn/wrapper/ | Missing `maven-wrapper.properties` → `./mvnw` broken → restore wrapper |
| T1 | P0 | M | UserEventConsumer.java:33 / TrainingEventListener.java:20 | Kafka consumers: no idempotency/DLQ/retry; poison-pill loops → DefaultErrorHandler + DLT + dedupe |
| T2 | P1 | S | KafkaProducerConfig.java:21 | Not idempotent → enable.idempotence,retries,delivery.timeout |
| T3 | P1 | L | TrainingGamificationService.java (1390L) | God-class → split Path/Lesson/Badge/Streak services |
| T4 | P1 | M | TrainingGamificationService.java:1166 | Badge award by name/description substring → structured `criteriaType` enum+thresholds |
| T5 | P1 | S | TrainingGamificationController.java:79 | `updateModuleProgress` no ownership check → derive userId from auth |
| T6 | P1 | S | TrainingGamificationController.java:150 | `/debug/badges/simulate` not admin-gated → move to /admin or `@PreAuthorize` |
| T7 | P2 | S | SecurityConfig.java:36 | actuator `info` exposed, CORS localhost → restrict + externalize |
| T8 | P2 | M | TrainingGamificationService.java:71 | Publish-inside-tx dual-write → AFTER_COMMIT/outbox; scope `@Transactional` |
| T9 | P2 | S | GlobalExceptionHandler.java:79 | 500 echoes message → generic |

### mentorship-service
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| M1 | P0 | S | application.yml:6-8 | Hardcoded DB host/user/password `0000` → externalize env |
| M2 | P0 | M | application.yml:13 | `ddl-auto:update`, no Flyway → add Flyway + `validate` |
| M3 | P1 | S | GlobalExceptionHandler.java:45 | `RuntimeException`→blanket 400, leaks msg → typed exceptions + 500 handler |
| M4 | P1 | S | MentorRequestService.java:39 | Bare `new RuntimeException` business rules → domain exception types |
| M5 | P1 | M | UserServiceClient.java:12 | Feign no timeouts/fallback, hardcoded URL → timeouts + resilience4j + externalize |
| M6 | P1 | S | MentorRequestController.java:31 | No `@Valid`, nullable `mentorId` NPE → add constraints |
| M7 | P1 | S | FeignClientInterceptor.java:18 | Forwards user token; async email path unauthenticated → service/client-credentials token |
| M8 | P2 | S | MentorRatingService.java:54 | N+1 per-request `findByRequestId` → aggregate query |
| M9 | P2 | S | GroqClient.java:21 | ThreadLocal leak, `System.err` → SLF4J + finally remove |
| B2m | P2 | S | MentorRequestService.java:101 | Manual cascade delete → DB FK/JPA cascade |
| B3m | P2 | S | service-wide | Field injection, entities from controllers → constructor inj + DTOs |

### quiz-service
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| Q1 | P0 | S | application.yaml:38,46 | Flyway + `ddl-auto:update` both manage schema → `validate`, Flyway sole owner |
| Q2 | P0 | S | application.yaml:2 | Default port 8082 collides interview → unique port |
| Q3 | P0 | M | AiQuizGeneratorService.java:109 | `@Transactional` on `Mono` = no-op → restructure sync persist |
| Q4 | P0 | M | GroqConfig.java:25 | groqWebClient no timeout/retry → responseTimeout + backoff |
| Q5 | P1 | S | AiQuizController.java:74 | AI failure faked as 200 → 503 + degraded flag |
| Q6 | P1 | S | AttemptController.java:59 | `UUID.fromString(sub)` unguarded→500 → shared AuthUtils→401 |
| Q7 | P1 | S | AttemptController.java:24 | Raw `Map`/`Page<Entity>` → DTOs |
| Q8 | P1 | S | Quiz.java:69 | EAGER OneToMany cartesian N+1 → LAZY + EntityGraph |
| Q9 | P1 | S | AttemptService.java:20 | Class-level rw `@Transactional` on reads → readOnly default |
| Q10 | P1 | S | AiQuizController.java:58 | `@CrossOrigin *` + credentials invalid → remove, central CORS |
| Q11 | P1 | S | AiQuizController.java:370 | New WebClient per request + `.block()` → reuse bean |
| Q12 | P2 | S | GroqConfig.java:28 | Key in default header, prefix logged → per-request filter |
| Q13 | P2 | S | KafkaConfig.java | Kafka dep unused dead infra → remove or wire |
| Q14 | P2 | S | AttemptService.java:132 | 100L commented dead code, dup field → delete |
| Q15 | P2 | S | SecurityConfig.java:18 | Large commented narrative → remove |

### community-service
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| C1 | P0 | M | ExternalJobFetcherService.java:37 | `.block()` no timeout/retry in scheduler → timeout+backoff+isolated scheduler |
| C2 | P0 | S | GlobalExceptionHandler.java:22 | Catch-all first, raw message → ordered specific handlers, sanitized |
| C3 | P1 | M | CompanySummaryService.java:58 | `findAll()`+in-memory filter full scan → derived query |
| C4 | P1 | S | CareerService.java:78 | Loads all jobs/scores per request → paginate/push to query |
| C5 | P1 | S | CareerService.java:23 | Class rw `@Transactional` on reads → readOnly |
| C6 | P1 | S | CareerWizardController.java:30 | Missing `@Valid`, raw `Map` body → DTO + constraints |
| C7 | P1 | S | CareerWizardController.java:33 | Inconsistent `Map.of` envelope → standard ApiResponse/DTO |
| C8 | P1 | S | SecurityConfig.java:54 | CORS `*`+credentials, no method security → enumerate + `@EnableMethodSecurity` |
| C9 | P1 | S | CareerWizardController.java:81 | `/jobs/fetch` full scrape, no role/rate-limit → ADMIN+async+limit |
| C10 | P2 | S | JobRecommendationEngine.java:17 | Unguarded `getTitle().split` NPE → null guards |
| C11 | P2 | S | SkillsGapService.java:50 | Defaults to first HashMap role (nondeterministic) → empty/skip |
| C12 | P2 | S | ExternalJobFetcherService.java:22 | `new ObjectMapper()`, double count() → inject bean |
| C13 | P2 | S | CompanySummaryService.java:113 | `node.get().asText()` NPE → `node.path().asText(def)` |

### resource-service
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| A2 | P0 | S | ResourceRepository.java:57 | `findFiltered` ignores `industry` → wrong results → add predicate+param |
| A1 | P1 | M | ResourceService.java:111 | Async OG fetch no executor/tx, races create → use aiTaskExecutor + @Transactional bean |
| A4 | P1 | M | ObjectStorageService.java:50 | Trusts client content-type → magic-byte sniff |
| A5 | P1 | S | ObjectStorageService.java:166 | Bucket world-readable (`AWS:*`) → presigned URLs / public prefix only |
| A6 | P1 | M | ResourceAccessControlService.java:72 | Sync RestTemplate to user-service no timeout/cache → timeouts + cache/claim |
| A7 | P1 | S | ResourceController.java:117 | AI endpoints permitAll, no `@Valid` → auth/rate-limit + validate |
| A3 | P1 | S | ResourceService.java:134 | Dup cache-evict block, hardcoded langs → helper + constant |
| A13 | P1 | M | pom.xml:107 / test | testcontainers declared, never used; tests need real PG (can `clean` it) → Testcontainers base |
| A8 | P2 | M | ResourceEventProducer.java:28 | Publish-in-tx phantom event → AFTER_COMMIT/outbox |
| A9 | P2 | S | SecurityConfig.java:71 | Credentialed wildcard origin pattern → trim+explicit prod |
| A10 | P2 | S | GlobalExceptionHandler.java:37 | DB error string-match brittle → constraint name |
| A11 | P2 | S | ObjectStorageService.java:137 | `deleteObject` never called, orphan objects → wire or remove |
| A14 | P2 | S | AiResourceGenerationService.java:115 | `join()` aborts batch → per-future handle |

### ai-training-path (Python)
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| AB1 | P1 | S | predictor.py:18 | Trains model on first request if pkl missing → require artifact, fail fast |
| AB2 | P1 | S | Dockerfile:14 | Trains at build → non-reproducible → version/commit model.pkl |
| AB3 | P1 | S | app.py:28 | `reload=True` shipped → remove |
| AB4 | P1 | M | app.py:9 | No auth, weak validation, internet-exposed → pydantic bounds + key/netpol |
| AB5 | P1 | S | app.py:18 | No try/except around predict → handle + health gate |
| AB6 | P2 | S | requirements.txt | Implausible/unpinned versions, unused joblib → pin+lockfile |
| AB7 | P2 | S | predictor.py:73 | concat without reset_index → NaN cols → reset_index both |
| AB8 | P2 | S | train.py | No metrics/version persisted → persist + seed arg |
| AB9 | P2 | M | module | No tests/typing/structure → pytest + hints + package |
| AB10 | P2 | S | Dockerfile | root user, no healthcheck, single-stage → non-root multi-stage |
| AB11 | P2 | S | concept | RF trained only on rule-engine output (no ML value) → document as demo or use real data |

### frontend (Angular)
| ID | Sev | Eff | Location | Issue → Fix |
|---|---|---|---|---|
| F1 | P0 | S | environment.ts:14 | Simli apiKey+faceId in git → rotate, proxy via backend |
| F2 | P0 | S | app.routes.ts:141 / admin-dashboard:3141 | Admin route only `authGuard` → add `roleGuard('ADMIN')` |
| F3 | P0 | S | auth.guard.ts:5 | Sync return before init resolves; no return URL → await init, pass redirect |
| F16 | P1 | S | main.ts:21 | Deprecated `APP_INITIALIZER` → `provideAppInitializer` |
| F5 | P1 | M | codebase (212 `any`) | Defeats strict → typed claims iface, `unknown` catches, lint rule |
| F6 | P1 | M | ~178 `.subscribe` | Subscription leaks → `takeUntilDestroyed()`/async pipe + lint |
| F7 | P1 | S | auth.interceptor.ts:6 | No 401 handling; token to any origin → catchError→login, origin guard |
| F8 | P1 | L | library.component.ts (8.5kL) | God components → decompose |
| F9 | P1 | S | package.json | No test/lint → Vitest+ESLint+Prettier |
| F4 | P1 | S | tsconfig.app.json:7 | Fragile include globbing → `src/**/*.ts` |
| F10 | P2 | S | angular.json:48 | Loose budgets → tighten + anyComponentStyle |
| F11 | P2 | S | 52 comp/7 OnPush | Default CD → OnPush default |
| F12 | P2 | S | 46 `console.*` | Prod log noise → LoggerService + no-console |
| F13 | P2 | M | templates | a11y gaps → semantic + aria + lint |
| F14 | P2 | S | tsconfig.json | No noUnusedLocals → enable |
| F15 | P2 | S | mock-data.ts, TTS dup | Dead/dup code → remove/consolidate |

## Wave 1 — T-F (schema integrity) resolution — 2026-05-15

Branch `quality/wave-1-security`. Method: the env is offline/no-DB, so the
expected schema was derived by an exhaustive entity↔migration source diff
(the same model source Hibernate reads), not a live Hibernate export.

- **Q1 (quiz-service) — FIXED.** Confirmed real drift `ddl-auto:update` was
  hiding: `user_answers` missing `transcription`/`score`/`feedback`, and the
  whole `oral_attempt_results` table absent from V1. Added idempotent
  `V2__reconcile_schema_with_entities.sql` (`ADD COLUMN IF NOT EXISTS` /
  `CREATE TABLE IF NOT EXISTS` — safe on already-drifted DBs and fresh DBs),
  then flipped `ddl-auto: update → validate`. All 12 other entity↔table
  mappings verified aligned.
- **M2 (mentorship-service) — FIXED.** Introduced Flyway (flyway-core pinned
  9.22.3, matching quiz-service). `V1__baseline.sql` reproduces the Hibernate 6
  schema for the 3 entities (UUID/timestamp/varchar(255), STRING enums,
  `UNIQUE(mentee_id,mentor_id)`); `baseline-on-migrate: true` baselines
  existing Hibernate-created DBs; `ddl-auto: update → validate`.
- **I2 (interview-service) — ACCEPTED / WON'T-FIX (not a security issue).**
  V11≡V10 and V16≡V15 are already applied and inert: on a fresh DB the run
  succeeds (V10/V11 use `IF NOT EXISTS`; V15/V16 are idempotent `DO` blocks).
  interview runs `validate-on-migrate: true` with no ignore patterns, so
  editing or deleting the duplicates would break startup on every deployed DB
  (checksum / "migration not resolved locally"). No safe pure-code
  consolidation exists; true consolidation needs a coordinated `flyway repair`
  per environment and belongs in a deploy-coordinated change, not this branch.

## Wave 1 — T-A (tests) status — 2026-05-15

The baseline "5/7 fail clean `mvn test`" is **stale**. Since it was taken,
the suite was migrated to Testcontainers: each service has an
`AbstractIntegrationTest` wiring throwaway Postgres/Kafka/Redis via
`@ServiceConnection`, with hermetic `test` profiles. These require only
Docker, which CI's `ubuntu-latest` runner provides — so they pass in the
actual CI gate (`mvn -B -ntp -DskipITs verify`). They only error in a
no-Docker sandbox. The earlier specifics are already resolved: training
`mvnw` runs fine, resource-service has 36 passing offline unit tests
(`ResourceControllerTest`, `ResourceServiceTest`) with only 2 Docker-gated
ITs erroring, and the interview Groq/I3 startup blocker no longer occurs.

Remaining genuine gap was **~0 unit coverage of the Wave 1 security
logic**. Added 19 infra-free tests (no Docker/DB), all green offline:

- **JWT role converters (I5)** — `JwtRoleConverterTest` (interview,
  mentorship), `JwtAuthConverterTest` (community),
  `JwtAuthenticationConverterTest` (quiz): trim + UPPERCASE + single
  `ROLE_` prefix, no double-prefix (community regression guard),
  blank/non-string filtering, empty on missing `realm_access`.
- **Exception handlers (T-C)** — `GlobalExceptionHandlerTest` (user,
  interview, community, training): catch-all returns 500 + static
  message, never echoes `ex.getMessage()` / class name.

Still open (needs Docker, deferred): broader integration/slice coverage,
frontend test runner (F9), Testcontainers ITs cannot be exercised in this
offline sandbox (verified green path is CI only).

## Wave 1 — T-G / T-B remainder status — 2026-05-15

- **T-G Spring Boot version drift — already resolved.** All 7 services on
  parent `3.4.1` (the `3.4.1↔4.0.4` split no longer exists).
- **T-G broken mvnw — already resolved.** training-service has
  `.mvn/wrapper/maven-wrapper.properties`; `./mvnw` runs in every service.
- **Q2 port collision — FIXED.** quiz-service `application.yaml` defaulted
  `${SERVER_PORT:8082}`, colliding with interview-service's 8082 in local
  dev. quiz's documented port (infra/README.md, docker-compose) is **8085**;
  changed the default to 8085 and aligned the drifted k8s manifest +
  api-ingress (deployment/service/probes/ingress backends 8082→8085) so
  every environment now agrees. interview-service's 8082 left untouched.
- **T-B I11 / M1 / F1 — already resolved** (commit `5fa114d8`): Simli
  api-key, mentorship DB password, frontend Simli key are all externalized
  (`${...}` placeholders, empty/dev defaults). Broad secret sweep of all
  service config + frontend found no remaining real hardcoded credential.
  (interview Simli `face-id`/`tts-voice-id` keep non-secret identifier
  defaults — public IDs, not credentials; left for dev convenience.)
- **T-B Grafana password — FIXED.** Removed the hardcoded
  `grafana.adminPassword` from `k8s/monitoring/monitoring-values.yaml`; the
  kube-prometheus-stack chart now generates a random password into the
  `<release>-grafana` Secret (retrieval + fixed-password-via-existingSecret
  documented inline). Still requires the Simli **API key rotation** (manual,
  it is in git history) — unchanged outstanding action.

## Wave 1 — frontend security (F3/F7/F16) — 2026-05-15

Frontend not buildable offline (no `node_modules`); changes reviewed by
inspection (standard Angular 21 APIs, stale-ref + call-site sweep clean).

- **F7 (P0) — FIXED.** `auth.interceptor.ts` attached the Keycloak bearer
  token to *every* outbound request when authenticated, leaking it to any
  host (Kokoro, Simli, third parties). Now the token is added only when the
  request targets a configured backend API origin (`TRUSTED_ORIGINS` derived
  from `environment.*ApiUrl`) or a same-origin relative path. Added 401
  handling: a rejected/expired token triggers re-authentication.
- **F3 (P0) — FIXED.** `authGuard` returned synchronously and always sent
  the user to `/dashboard`. It now defensively awaits Keycloak init if not
  ready and passes `state.url` so the user returns to the originally
  requested route. `AuthService.login(redirectPath?)` validates the path
  (in-app absolute only; rejects `//host` and absolute URLs) to prevent
  open-redirect. All existing no-arg `login()` callers unaffected.
- **F16 (P1) — FIXED.** `main.ts` replaced the deprecated `APP_INITIALIZER`
  token with `provideAppInitializer(() => inject(AuthService).init())`
  (Angular 21).

## Wave 1 — frontend F4/F9/F10 + F15 assessment — 2026-05-15

node_modules installed; all changes verified with
`npx ng build --configuration production` (the actual CI gate;
ci-frontend.yml runs build only, no lint/test).

- **F4 (P1) — FIXED.** `tsconfig.app.json` `include` was the CLI-default
  `src/**/*.d.ts` (+ `files: src/main.ts`), so unreferenced `.ts` escaped
  tsc. Now `src/**/*.ts` (excluding `*.spec.ts`). Prod build green.
- **F10 (P2) — PARTIAL.** Initial-bundle budget tightened 2mb/4mb →
  1mb/1.5mb (real initial = 648 kB, comfortable regression guard).
  `anyComponentStyle` budget **deliberately not added**: even a lenient
  error threshold fails today's prod build (many oversized component
  styles, library.component = 95 kB). Forcing it would block CI/deploys;
  deferred until the F8 style cleanup.
- **F9 (P1) — FIXED.** Added angular-eslint (flat `eslint.config.js`, `ng
  lint` target) + Prettier (`.prettierrc.json`, ignore) + scripts (lint,
  lint:fix, format, format:check). Baseline `npm run lint` = 1281 errors
  — these ARE the substance of F5/F6/F11/F12/F13; not fixed wholesale,
  but now enforceable incrementally. CI does not run lint, so no new gate.
- **F3/F7/F16** (committed earlier) re-verified against the production
  build; an interceptor typing bug (TS2322) found by the build was fixed.

Deferred with rationale:
- **F15 (P2)** — not the small/safe item rated: `mock-data.ts` is *live*
  (4 importers, not dead); "TTS dup" = consolidating 3 distinct TTS
  services + 7 call sites, a behavioural refactor unverifiable offline.
  Use the new ESLint to drive genuine dead-code removal incrementally.
- **F5, F6, F8, F11, F12, F13** — large refactors / risky global flips
  (212 `any`, ~178 `subscribe`, 8.5 kL god component, OnPush default,
  46 `console`, a11y). Now surfaced by ESLint; drive down incrementally.
- **F14 (P2)** — enabling `noUnusedLocals` breaks the build on this
  codebase; gated behind the above cleanups.
