-- V9__add_lessons_catalog_and_module_lessons.sql
-- Adds a curated lesson catalog + per-path module lesson snapshots.

CREATE TABLE IF NOT EXISTS training_lessons
(
    id                BIGSERIAL PRIMARY KEY,
    category          VARCHAR(50)   NOT NULL,
    title             VARCHAR(500)  NOT NULL,
    format            VARCHAR(20)   NOT NULL,
    summary           TEXT,
    content_markdown  TEXT,
    video_url         TEXT,
    estimated_minutes INTEGER       NOT NULL DEFAULT 5,
    difficulty        VARCHAR(20)   NOT NULL DEFAULT 'BEGINNER',
    language          VARCHAR(10)   NOT NULL DEFAULT 'en',
    active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_training_lesson_category CHECK (category IN (
        'COMMUNICATION',
        'STRESS_MANAGEMENT',
        'CONTENT_PREP',
        'BODY_LANGUAGE',
        'INDUSTRY_SPECIFIC'
    )),
    CONSTRAINT chk_training_lesson_format CHECK (format IN ('TEXT', 'VIDEO')),
    CONSTRAINT chk_training_lesson_difficulty CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    CONSTRAINT chk_training_lesson_minutes CHECK (estimated_minutes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_training_lessons_category ON training_lessons (category);
CREATE INDEX IF NOT EXISTS idx_training_lessons_active ON training_lessons (active);

CREATE OR REPLACE FUNCTION update_training_lessons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_training_lessons_updated_at ON training_lessons;
CREATE TRIGGER trigger_training_lessons_updated_at
    BEFORE UPDATE ON training_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_training_lessons_updated_at();


CREATE TABLE IF NOT EXISTS training_lesson_tags
(
    lesson_id  BIGINT       NOT NULL,
    tag        VARCHAR(80)  NOT NULL,

    PRIMARY KEY (lesson_id, tag),
    CONSTRAINT fk_training_lesson_tags_lesson FOREIGN KEY (lesson_id) REFERENCES training_lessons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_lesson_tags_tag ON training_lesson_tags (tag);


CREATE TABLE IF NOT EXISTS training_module_lessons
(
    id                BIGSERIAL PRIMARY KEY,
    module_id         BIGINT        NOT NULL,
    lesson_id         BIGINT,

    -- Snapshot fields (so archived paths don't change when the catalog changes)
    title             VARCHAR(500)  NOT NULL,
    format            VARCHAR(20)   NOT NULL,
    content_markdown  TEXT,
    video_url         TEXT,
    estimated_minutes INTEGER       NOT NULL DEFAULT 5,

    order_index       INTEGER       NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    completed_at      TIMESTAMP,

    created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_training_module_lessons_module FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_module_lessons_lesson FOREIGN KEY (lesson_id) REFERENCES training_lessons(id) ON DELETE SET NULL,
    CONSTRAINT chk_training_module_lesson_format CHECK (format IN ('TEXT', 'VIDEO')),
    CONSTRAINT chk_training_module_lesson_status CHECK (status IN ('PENDING', 'COMPLETED')),
    CONSTRAINT chk_training_module_lesson_order CHECK (order_index >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_training_module_lessons_module_order ON training_module_lessons (module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_training_module_lessons_module ON training_module_lessons (module_id);
CREATE INDEX IF NOT EXISTS idx_training_module_lessons_status ON training_module_lessons (status);
