-- V2__create_questions.sql
CREATE TABLE questions (
    id                      BIGSERIAL PRIMARY KEY,
    text                    TEXT            NOT NULL,
    type                    VARCHAR(50)     NOT NULL,
    industry                VARCHAR(50)     NOT NULL,
    difficulty              VARCHAR(50)     NOT NULL,
    expected_method         VARCHAR(255),
    sample_answer           TEXT,
    avg_answer_time_seconds INTEGER,
    avg_score_on_platform   DOUBLE PRECISION,
    times_used              INTEGER         NOT NULL DEFAULT 0,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_questions_type        ON questions(type);
CREATE INDEX idx_questions_industry    ON questions(industry);
CREATE INDEX idx_questions_difficulty  ON questions(difficulty);
CREATE INDEX idx_questions_is_active   ON questions(is_active);

-- Composite index — matches the core QuestionSelectionService query exactly
CREATE INDEX idx_questions_selector    ON questions(type, industry, difficulty, is_active);