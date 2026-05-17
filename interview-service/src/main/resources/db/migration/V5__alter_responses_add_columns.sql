-- V5__alter_responses_add_columns.sql
ALTER TABLE responses
    ADD COLUMN IF NOT EXISTS audio_file_url  VARCHAR(500),
    ADD COLUMN IF NOT EXISTS video_file_url  VARCHAR(500),
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS word_count       INTEGER,
    ADD COLUMN IF NOT EXISTS overall_score    DOUBLE PRECISION;