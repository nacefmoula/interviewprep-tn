-- V7__add_training_preferences_and_signals.sql
-- Store user training preferences (explicit choices) and last known performance signals.

CREATE TABLE IF NOT EXISTS training_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    goal VARCHAR(50) NULL,
    target_role VARCHAR(120) NULL,
    seniority VARCHAR(50) NULL,
    minutes_per_day INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_training_preferences_minutes_per_day'
    ) THEN
        ALTER TABLE training_preferences
            ADD CONSTRAINT chk_training_preferences_minutes_per_day
            CHECK (minutes_per_day IS NULL OR minutes_per_day >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS training_user_signals (
    user_id VARCHAR(255) PRIMARY KEY,
    last_session_id BIGINT NULL,
    session_type VARCHAR(80) NULL,
    global_score DOUBLE PRECISION NULL,
    preparation_level VARCHAR(80) NULL,
    total_sessions_completed INTEGER NULL,
    event_generated_at VARCHAR(80) NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_user_signals_updated_at ON training_user_signals(updated_at);
