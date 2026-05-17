CREATE TABLE IF NOT EXISTS live_interview_sessions (
    id                    BIGSERIAL PRIMARY KEY,
    interview_session_id  BIGINT NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
    status                VARCHAR(32) NOT NULL,
    current_question_id   BIGINT REFERENCES questions(id),
    answered_count        INTEGER NOT NULL DEFAULT 0,
    max_questions         INTEGER NOT NULL DEFAULT 6,
    created_at            TIMESTAMP NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_interview_session_session_id
    ON live_interview_sessions(interview_session_id);