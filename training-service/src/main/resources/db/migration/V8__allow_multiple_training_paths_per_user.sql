-- V8__allow_multiple_training_paths_per_user.sql
-- Allow multiple training paths per user so we can keep history.

-- Drop the UNIQUE constraint on training_paths.user_id (default name in Postgres).
ALTER TABLE training_paths
    DROP CONSTRAINT IF EXISTS training_paths_user_id_key;

-- Helpful composite index for selecting the current path quickly.
CREATE INDEX IF NOT EXISTS idx_training_paths_user_status_created_at
    ON training_paths (user_id, status, created_at DESC);
