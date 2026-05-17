-- V1__create_training_entities.sql
-- Training Path and Module tables for M4 - Training & Gamification

CREATE TABLE IF NOT EXISTS training_paths
(
    id                  BIGSERIAL PRIMARY KEY,
    user_id             VARCHAR(255)    NOT NULL UNIQUE,
    xp_threshold        INTEGER         NOT NULL DEFAULT 0,
    status              VARCHAR(30)     NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_training_path_status CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED'))
);

CREATE INDEX idx_training_paths_user_id ON training_paths (user_id);
CREATE INDEX idx_training_paths_status ON training_paths (status);

-- Trigger for updated_at column
CREATE OR REPLACE FUNCTION update_training_paths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_training_paths_updated_at
    BEFORE UPDATE ON training_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_training_paths_updated_at();


CREATE TABLE IF NOT EXISTS training_modules
(
    id                  BIGSERIAL PRIMARY KEY,
    path_id             BIGINT          NOT NULL,
    category            VARCHAR(50)     NOT NULL,
    title               VARCHAR(500)    NOT NULL,
    description         TEXT,
    lessons             INTEGER         NOT NULL DEFAULT 0,
    completed_lessons   INTEGER         NOT NULL DEFAULT 0,
    progress            INTEGER         NOT NULL DEFAULT 0,
    xp_reward           INTEGER         NOT NULL DEFAULT 0,
    status              VARCHAR(30)     NOT NULL DEFAULT 'LOCKED',
    unlock_at           TIMESTAMP,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_training_modules_path FOREIGN KEY (path_id) REFERENCES training_paths(id) ON DELETE CASCADE,
    CONSTRAINT chk_training_module_progress CHECK (progress BETWEEN 0 AND 100),
    CONSTRAINT chk_training_module_status CHECK (status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT chk_training_module_category CHECK (category IN (
        'COMMUNICATION', 
        'STRESS_MANAGEMENT', 
        'CONTENT_PREP', 
        'BODY_LANGUAGE', 
        'INDUSTRY_SPECIFIC'
    )),
    CONSTRAINT chk_training_module_lessons CHECK (lessons >= 0),
    CONSTRAINT chk_training_module_completed CHECK (completed_lessons <= lessons)
);

CREATE INDEX idx_training_modules_path_id ON training_modules (path_id);
CREATE INDEX idx_training_modules_status ON training_modules (status);
CREATE INDEX idx_training_modules_category ON training_modules (category);

-- Trigger for training_modules updated_at
CREATE OR REPLACE FUNCTION update_training_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_training_modules_updated_at
    BEFORE UPDATE ON training_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_training_modules_updated_at();
