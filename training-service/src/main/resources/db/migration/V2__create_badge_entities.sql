-- V2__create_badge_entities.sql
-- Badge catalog and UserBadge join table for M4 Gamification

CREATE TABLE IF NOT EXISTS badges
(
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    icon                VARCHAR(50),
    category            VARCHAR(50)     NOT NULL,
    xp_reward           INTEGER         NOT NULL DEFAULT 0,
    criteria_json       TEXT,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_badge_category CHECK (category IN (
        'SIMULATION', 
        'COMMUNITY', 
        'STREAK', 
        'PERFORMANCE', 
        'MILESTONE'
    )),
    CONSTRAINT chk_badge_xp_reward CHECK (xp_reward >= 0)
);

CREATE INDEX idx_badges_category ON badges (category);
CREATE INDEX idx_badges_is_active ON badges (is_active);

-- Trigger for badges updated_at
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_badges_updated_at();


CREATE TABLE IF NOT EXISTS user_badges
(
    id                  BIGSERIAL PRIMARY KEY,
    user_id             VARCHAR(255)    NOT NULL,
    badge_id            BIGINT          NOT NULL,
    earned_date         TIMESTAMP       NOT NULL DEFAULT NOW(),
    progress            INTEGER         DEFAULT 0,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_badge_unique UNIQUE (user_id, badge_id),
    CONSTRAINT chk_user_badge_progress CHECK (progress >= 0)
);

CREATE INDEX idx_user_badges_user_id ON user_badges (user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges (badge_id);
CREATE INDEX idx_user_badges_earned_date ON user_badges (earned_date DESC);
