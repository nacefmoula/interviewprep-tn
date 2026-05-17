-- Groq AI returns expectedMethod values longer than 255 chars.
-- The VARCHAR(255) caused a DataIntegrityViolationException on every first
-- save attempt, wasting a Groq call and adding ~1s latency each time.
ALTER TABLE questions
    ALTER COLUMN expected_method TYPE TEXT;