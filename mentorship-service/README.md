# Mentorship Service

The **Mentorship Service** is the backend microservice responsible for the mentorship workflow in Pi-CloudDOOM:

- mentees (regular users) can **request** a mentor
- mentors can **accept/decline** requests
- mentors can **schedule** mentorship sessions
- both sides can **view sessions**, and sessions can be **completed/cancelled**

This service is designed to work with:
- **Keycloak** (JWT authentication + realm roles)
- **user-service** (source of truth for user UUIDs, profiles, availability)
- the Angular frontend mentorship pages (calendar + in-app meeting)

---

## Concept (how it works)

### Roles
The service authorizes requests using Keycloak realm roles (converted into Spring authorities):

- `ROLE_USER` (mentee)
- `ROLE_MENTOR` (mentor)
- `ROLE_ADMIN` (admin analytics — if enabled in your branch)

> Note: The mentorship domain uses **user-service UUIDs** (not the Keycloak `sub`) when storing `menteeId`/`mentorId`.

### Core objects

- **MentorRequest**
  - links a mentee → mentor
  - has a `status`: `PENDING`, `ACCEPTED`, `DECLINED`
  - has a `createdAt`

- **MentorSession**
  - created after (or for) an accepted request
  - has a `status`: `SCHEDULED`, `COMPLETED`, `CANCELLED`
  - has `scheduledAt`
  - has `meetingLink` **used as a Jitsi “room name”** (not an external URL)

### Typical flow
1. Mentee sends a mentorship request (`PENDING`)
2. Mentor accepts or declines
3. If accepted, mentor schedules a session
4. Frontend shows sessions on a calendar
5. At scheduled time, the user can join the session **in-app** (Jitsi embed)
6. Mentor marks the session as `COMPLETED` when finished

---

## Features

- Mentorship requests (create, list by mentee, list by mentor)
- Mentor actions: accept/decline requests
- Sessions: create, list by request, cancel, complete
- Mentor recommendations: deterministic scoring + optional AI explanation/chat (Gemini → Groq fallback)
- Calendar-friendly data (`scheduledAt`) for frontend calendar rendering
- In-app meeting support (frontend embeds Jitsi; backend stores a room name)
- Room name generation: if the mentor leaves room name empty, the service generates one (`mentorship-<random>`)
- Email notifications (SMTP): when a session is scheduled/cancelled, the service sends emails to both mentor + mentee (best-effort, asynchronous)

---

## API (main endpoints)

Base path:
- `http://localhost:8084/api`

### Mentor requests
- `POST /mentor-requests` (mentee)
- `GET /mentor-requests/mentee/{menteeId}` (mentee/mentor)
- `GET /mentor-requests/mentor/{mentorId}` (mentee/mentor)
- `PUT /mentor-requests/{id}/accept` (mentor)
- `PUT /mentor-requests/{id}/decline` (mentor)
- `DELETE /mentor-requests/{id}` (mentee/mentor)

### Sessions
- `POST /mentor-sessions` (mentor)
- `GET /mentor-sessions/request/{requestId}` (mentee/mentor)
- `PUT /mentor-sessions/{id}/complete` (mentor)
- `PUT /mentor-sessions/{id}/cancel` (mentee/mentor)

### Mentor ratings
- `GET /mentor-ratings/mentor/{mentorId}/stats` (any authenticated user)
- `POST /mentor-ratings/mentor/{mentorId}` (USER)
- `DELETE /mentor-ratings/mentor/{mentorId}` (USER)
- `GET /mentor-ratings/me` (USER)

### Emails (admin test endpoints)
Base path:
- `http://localhost:8084/api/emails`

Endpoints:
- `POST /emails/test` (ADMIN) — send raw HTML email
- `POST /emails/session-reminder/test` (ADMIN) — send a templated “Session reminder” email

Automatic behavior:
- When a mentor schedules a session, the service sends a “Session reminder” email to both mentor + mentee.
- When a session is cancelled, the service sends a “Session cancelled” email to both mentor + mentee.
- Email sending runs asynchronously so schedule/cancel endpoints return fast even if SMTP is slow or rate-limited.

Authentication:
- All endpoints require a Bearer token (JWT), except actuator/swagger if enabled in security config.

---

## Mentor recommendations (AI)

Endpoints (JWT required):
- `GET /api/recommendations` — returns a scored list of mentors for the current mentee.
- `POST /api/recommendations/chat` — mentor-focused assistant (not a general chatbot). If the user sends only a greeting ("hi", "hello", "bonjour"…), the reply reminds them to ask only about the mentor recommendation.

Chat request body:

```json
{
  "mentorId": "<uuid>",
  "message": "Why is this mentor recommended for me?"
}
```

Chat response body:

```json
{
  "reply": "..."
}
```

### AI providers & env vars

Provider chain:
1) Gemini (primary)
2) Groq (fallback)
3) Offline/rule-based response (if both fail or are not configured)

When running with Docker Compose, these env vars are passed from `infra/docker-compose.yml`:

```bash
GEMINI_API_KEY=...
GEMINI_API_URL=...      # optional override
GROQ_API_KEY=...
GROQ_MODEL=...          # optional override
GROQ_API_URL=...        # optional override
```

Recommended: set them in `infra/.env` (uncommitted).

---

## Tech stack & versions

From `pom.xml`:
- Java: **21**
- Spring Boot: **4.0.4**
- Spring Cloud: **2025.1.1**
- Persistence: Spring Data JPA + **PostgreSQL** (runtime)
- AuthN/AuthZ: Spring Security OAuth2 Resource Server (JWT)

Infrastructure (from `infra/docker-compose.yml`):
- PostgreSQL image: **postgres:16-alpine**
- Keycloak image: **quay.io/keycloak/keycloak:24.0.1**

---

## Running the service

### Option A (recommended): run with Docker Compose
This is the intended dev setup because the mentorship service depends on Keycloak and user-service.

1) Start the full stack:

```bash
cd infra
docker compose up -d --build
```

2) Mentorship service is exposed on:

- `http://localhost:8084`

3) Watch logs if needed:

```bash
docker logs userservice-mentorship -f
```

### Option B: run tests locally (fast)

```bash
cd mentorship-service
./mvnw test
```

### Option C: run locally with Maven (advanced)
You can run the app locally, but note the service calls user-service via Feign using the Docker hostname:

- `UserServiceClient` is currently configured with `url = "http://user-service:8081"`

That hostname resolves automatically **inside Docker Compose**, but usually does *not* resolve when running the service directly on your machine.

If you still want to run it locally, you typically need one of these approaches:
- run user-service in Docker and add a hosts entry for `user-service`
- or change the Feign URL to point to `http://localhost:8081` (code/config change)

When running via Docker Compose, the `SERVER_PORT` is set to `8084` by environment variables (even though `application.yml` defaults to another port).

---

## Notes & troubleshooting

- **403 Forbidden** usually means your token is missing the required realm role (`ROLE_USER` / `ROLE_MENTOR`).
- **IDs**: the service uses user-service UUIDs. If you pass a Keycloak `sub` to list requests, you won’t see your data.
- **Meeting room**: `meetingLink` is treated as a **room name** for Jitsi (e.g. `mentorship-abc123`).
- **Email delivery can be delayed** in dev environments when your SMTP provider rate-limits (e.g., “too many emails per second”). The service retries in the background; API calls should not be blocked.

---

## Related services

- user-service: users, roles, mentor availability, `/api/users/me`
- frontend: mentorship pages render calendars + embed meetings
