# User Service

Spring Boot microservice for user profile and role management.

## Prerequisites

- Java 21
- Docker + Docker Compose

## Option 1: Run with full stack in Docker

From repository root:

```bash
cd infra
cp .env.example .env
docker compose up -d --build user-service
```

Service URLs:

- User API: `http://localhost:8081`
- Health: `http://localhost:8081/actuator/health`
- Keycloak: `http://localhost:8080`

## Option 2: Run service locally (deps in Docker)

Start infra dependencies:

```bash
cd infra
cp .env.example .env
docker compose up -d postgres redis kafka keycloak
```

Run app:

```bash
cd ../user-service
./mvnw spring-boot:run
```

## Build and test

```bash
./mvnw clean test
./mvnw clean package
```

## Docker image only

```bash
cd user-service
docker build -t user-service:local .
docker run --rm -p 8081:8081 --env-file .env.example user-service:local
```

## Required environment variables

Use `user-service/.env.example` as baseline.

Key variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_REDIS_HOST`
- `SPRING_REDIS_PORT`
- `SPRING_REDIS_PASSWORD`
- `SPRING_KAFKA_BOOTSTRAP_SERVERS`
- `KEYCLOAK_ISSUER_URI`
- `KEYCLOAK_JWK_SET_URI`

## Core role behavior

- New user default role: `USER`
- Admin can update roles via API
- Global security filter synchronizes `ADMIN` role from Keycloak token to DB role

## Main API endpoints

- `POST /api/users/register`
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/users` (ADMIN)
- `PATCH /api/users/{id}/role` (ADMIN)

## Notes for team integration

- Consume this service via HTTP API; do not copy business logic into other services.
- If payload contracts change, update shared docs and notify the team.
