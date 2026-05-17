-- V23__add_language_to_interview_sessions.sql
-- Adds a per-session language choice used by the multilingual Vosk STT pipeline.
-- Existing rows default to EN so the backfill is safe.

ALTER TABLE interview_sessions
    ADD COLUMN language VARCHAR(16) NOT NULL DEFAULT 'EN';

-- Optional: index if you ever want to filter sessions by language in the UI.
CREATE INDEX idx_interview_sessions_language ON interview_sessions(language);