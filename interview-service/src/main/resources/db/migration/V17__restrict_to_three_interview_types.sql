-- V17__restrict_to_three_interview_types.sql

-- ── 1. interview_sessions ────────────────────────────────────────────────────

DO $$
BEGIN
    UPDATE interview_sessions
    SET type = 'BEHAVIORAL'
    WHERE type IN ('PANEL', 'PITCH');

    ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS chk_type;

    ALTER TABLE interview_sessions
        ADD CONSTRAINT chk_type
        CHECK (type IN ('BEHAVIORAL', 'TECHNICAL', 'CASE_STUDY'));
END $$;

-- ── 2. questions ─────────────────────────────────────────────────────────────

DO $$
BEGIN
    UPDATE questions
    SET type = 'BEHAVIORAL'
    WHERE type IN ('PANEL', 'PITCH');

    ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;

    ALTER TABLE questions
        ADD CONSTRAINT questions_type_check
        CHECK (type IN ('BEHAVIORAL', 'TECHNICAL', 'SITUATIONAL', 'CASE_STUDY'));
END $$;