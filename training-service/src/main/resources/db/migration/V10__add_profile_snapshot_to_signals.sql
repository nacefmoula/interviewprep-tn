-- V10__add_profile_snapshot_to_signals.sql
-- Caches user profile fields in training_user_signals to avoid runtime HTTP calls
-- to user-service during training path generation.

ALTER TABLE training_user_signals
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10),
    ADD COLUMN IF NOT EXISTS preferred_industry VARCHAR(60),
    ADD COLUMN IF NOT EXISTS user_plan VARCHAR(20),
    ADD COLUMN IF NOT EXISTS skills_snapshot VARCHAR(1000);
