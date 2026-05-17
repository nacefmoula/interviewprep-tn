CREATE TABLE user_resource_engagements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    resource_id     UUID         NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'NOT_STARTED',
    progress_pct    SMALLINT     NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    open_count      INTEGER      NOT NULL DEFAULT 0,
    notes           VARCHAR(600),
    first_opened_at TIMESTAMPTZ,
    last_opened_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_resource_engagement UNIQUE (user_id, resource_id)
);

CREATE TABLE user_resource_engagement_days (
    engagement_id UUID        NOT NULL REFERENCES user_resource_engagements(id) ON DELETE CASCADE,
    day_key       CHAR(10)    NOT NULL,
    PRIMARY KEY (engagement_id, day_key)
);

CREATE INDEX idx_ure_user_id ON user_resource_engagements(user_id);
