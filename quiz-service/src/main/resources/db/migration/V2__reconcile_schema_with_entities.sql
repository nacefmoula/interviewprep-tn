-- V2: Reconcile the Flyway schema with the JPA entities so that
-- spring.jpa.hibernate.ddl-auto can be flipped from `update` to `validate`
-- (Flyway becomes the sole schema owner).
--
-- Until now ddl-auto:update silently created the objects below at startup.
-- Every statement is guarded with IF NOT EXISTS so this migration is a no-op
-- on databases where `update` had already added them, and creates them on
-- fresh databases.

-- 1. UserAnswer gained oral-evaluation fields not present in V1.user_answers
ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS feedback VARCHAR(255);

-- 2. OralAttemptResult entity (@Table "oral_attempt_results") — table was
--    never in V1. String @Id with GenerationType.UUID -> varchar; attemptId
--    and questionId are plain String fields (not FKs).
CREATE TABLE IF NOT EXISTS oral_attempt_results (
    id             VARCHAR(36) PRIMARY KEY,
    attempt_id     VARCHAR(255) NOT NULL,
    question_id    VARCHAR(255) NOT NULL,
    transcription  TEXT,
    score          INTEGER      NOT NULL,
    feedback       TEXT,
    is_correct     BOOLEAN      NOT NULL,
    created_at     TIMESTAMP
);
