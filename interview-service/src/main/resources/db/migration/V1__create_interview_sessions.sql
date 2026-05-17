CREATE TABLE IF NOT EXISTS interview_sessions
(
    id               BIGSERIAL PRIMARY KEY,
    user_id          VARCHAR(255)    NOT NULL,
    type             VARCHAR(50)     NOT NULL,
    industry         VARCHAR(50)     NOT NULL,
    target_level     VARCHAR(50)     NOT NULL,
    status           VARCHAR(50)     NOT NULL DEFAULT 'IN_PROGRESS',
    duration_minutes INTEGER         NOT NULL,
    difficulty_level INTEGER         NOT NULL,
    is_recorded      BOOLEAN         NOT NULL DEFAULT FALSE,
    consent_given    BOOLEAN         NOT NULL DEFAULT FALSE,
    recording_url    VARCHAR(512),
    started_at       TIMESTAMP,
    ended_at         TIMESTAMP,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_difficulty     CHECK (difficulty_level BETWEEN 1 AND 10),
    CONSTRAINT chk_duration       CHECK (duration_minutes > 0),
    CONSTRAINT chk_status         CHECK (status IN ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_type           CHECK (type IN ('BEHAVIORAL', 'TECHNICAL', 'CASE_STUDY', 'PANEL', 'PITCH')),
    CONSTRAINT chk_industry       CHECK (industry IN ('IT_TECH', 'FINANCE', 'HEALTH', 'ENGINEERING', 'CONSULTING', 'SALES_MARKETING')),
    CONSTRAINT chk_target_level   CHECK (target_level IN ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD')),
    CONSTRAINT chk_consent        CHECK (is_recorded = FALSE OR consent_given = TRUE)
    );

CREATE INDEX idx_interview_sessions_user_id
    ON interview_sessions (user_id);

CREATE INDEX idx_interview_sessions_status
    ON interview_sessions (status);

CREATE INDEX idx_interview_sessions_user_created
    ON interview_sessions (user_id, created_at DESC);