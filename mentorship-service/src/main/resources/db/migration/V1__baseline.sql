-- V1: Flyway baseline for mentorship-service.
--
-- Previously ddl-auto:update was the only schema manager. This baseline
-- reproduces exactly what Hibernate 6 (Spring Boot 3.4) generates for the
-- three entities, so ddl-auto can move to `validate` with Flyway owning the
-- schema. Types follow Hibernate 6 defaults on PostgreSQL: java.util.UUID ->
-- uuid, LocalDateTime -> timestamp, String / @Enumerated(STRING) -> varchar(255).
--
-- spring.flyway.baseline-on-migrate=true means existing databases (already
-- created by Hibernate) are baselined at V1 without re-running this script;
-- fresh databases run it. Every statement is IF NOT EXISTS for safety.

CREATE TABLE IF NOT EXISTS mentor_requests (
    id          UUID PRIMARY KEY,
    mentee_id   UUID,
    mentor_id   UUID,
    status      VARCHAR(255),
    created_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentor_sessions (
    id           UUID PRIMARY KEY,
    request_id   UUID,
    scheduled_at TIMESTAMP,
    meeting_link VARCHAR(255),
    status       VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS mentor_ratings (
    id          UUID PRIMARY KEY,
    mentee_id   UUID,
    mentor_id   UUID,
    session_id  UUID,
    stars       INTEGER NOT NULL,
    comment     VARCHAR(255),
    created_at  TIMESTAMP,
    CONSTRAINT uk_mentor_ratings_mentee_mentor UNIQUE (mentee_id, mentor_id)
);
