-- V6__add_daily_activity_goal_counters.sql
-- Add explicit per-goal counters for server-authoritative daily goals.

ALTER TABLE daily_activities
    ADD COLUMN IF NOT EXISTS behavioral_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS library_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quiz_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_daily_activity_behavioral_count'
    ) THEN
        ALTER TABLE daily_activities
            ADD CONSTRAINT chk_daily_activity_behavioral_count CHECK (behavioral_count >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_daily_activity_library_count'
    ) THEN
        ALTER TABLE daily_activities
            ADD CONSTRAINT chk_daily_activity_library_count CHECK (library_count >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_daily_activity_quiz_count'
    ) THEN
        ALTER TABLE daily_activities
            ADD CONSTRAINT chk_daily_activity_quiz_count CHECK (quiz_count >= 0);
    END IF;
END $$;
