-- V4__create_responses.sql
CREATE TABLE responses (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT          NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id     BIGINT          NOT NULL REFERENCES questions(id),
    transcription   TEXT,
    audio_file_url  VARCHAR(500),
    video_file_url  VARCHAR(500),
    duration_seconds INTEGER,
    word_count      INTEGER,
    overall_score   DOUBLE PRECISION,
    recorded_at     TIMESTAMP       NOT NULL DEFAULT now()
);

CREATE INDEX idx_responses_session_id ON responses(session_id);