-- V16: Ensure question types include PANEL and PITCH (idempotent)

DO $$
BEGIN
    -- Drop existing constraint if exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'questions'
          AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
    END IF;

    -- Recreate constraint with new values
    ALTER TABLE questions
    ADD CONSTRAINT questions_type_check
    CHECK (type IN (
        'BEHAVIORAL',
        'TECHNICAL',
        'SITUATIONAL',
        'CASE_STUDY',
        'PANEL',
        'PITCH'
    ));
END $$;