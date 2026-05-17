-- V4__create_user_xp_and_streaks.sql
-- Track user XP, levels, and streaks for gamification

CREATE TABLE IF NOT EXISTS user_xp_tracker
(
    id                  BIGSERIAL PRIMARY KEY,
    user_id             VARCHAR(255)    NOT NULL UNIQUE,
    total_xp            INTEGER         NOT NULL DEFAULT 0,
    current_level       INTEGER         NOT NULL DEFAULT 1,
    xp_to_next_level    INTEGER         NOT NULL DEFAULT 1000,
    current_streak      INTEGER         NOT NULL DEFAULT 0,
    longest_streak      INTEGER         NOT NULL DEFAULT 0,
    last_activity_date  DATE,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_xp_tracker_level CHECK (current_level >= 1),
    CONSTRAINT chk_xp_tracker_xp CHECK (total_xp >= 0),
    CONSTRAINT chk_xp_tracker_streak CHECK (current_streak >= 0),
    CONSTRAINT chk_xp_tracker_longest CHECK (longest_streak >= 0)
);

CREATE INDEX idx_user_xp_tracker_user_id ON user_xp_tracker (user_id);
CREATE INDEX idx_user_xp_tracker_level ON user_xp_tracker (current_level DESC);
CREATE INDEX idx_user_xp_tracker_total_xp ON user_xp_tracker (total_xp DESC);

-- Trigger for user_xp_tracker updated_at
CREATE OR REPLACE FUNCTION update_user_xp_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_user_xp_tracker_updated_at
    BEFORE UPDATE ON user_xp_tracker
    FOR EACH ROW
    EXECUTE FUNCTION update_user_xp_tracker_updated_at();


-- Daily activity tracking for streak calculation
CREATE TABLE IF NOT EXISTS daily_activities
(
    id                  BIGSERIAL PRIMARY KEY,
    user_id             VARCHAR(255)    NOT NULL,
    activity_date       DATE            NOT NULL,
    xp_earned           INTEGER         NOT NULL DEFAULT 0,
    session_completed   BOOLEAN         NOT NULL DEFAULT FALSE,
    goals_completed     INTEGER         NOT NULL DEFAULT 0,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_daily_activity_unique UNIQUE (user_id, activity_date),
    CONSTRAINT chk_daily_activity_xp CHECK (xp_earned >= 0)
);

CREATE INDEX idx_daily_activities_user_id ON daily_activities (user_id);
CREATE INDEX idx_daily_activities_date ON daily_activities (activity_date DESC);
CREATE INDEX idx_daily_activities_user_date ON daily_activities (user_id, activity_date DESC);
