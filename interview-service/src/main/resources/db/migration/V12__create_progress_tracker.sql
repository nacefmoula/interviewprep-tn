-- V12__create_progress_tracker.sql
CREATE TABLE progress_tracker (
    id                        BIGSERIAL PRIMARY KEY,
    user_id                   VARCHAR(255)     NOT NULL UNIQUE,
    total_sessions_completed  INTEGER          NOT NULL DEFAULT 0,
    average_score             DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    best_score                DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    current_preparation_level VARCHAR(50),
    last_session_at           TIMESTAMP
);

CREATE UNIQUE INDEX idx_progress_tracker_user_id ON progress_tracker(user_id);