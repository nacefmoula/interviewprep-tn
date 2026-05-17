-- V24__widen_question_text_columns.sql
-- AI-generated question content (text, expected_method, sample_answer) routinely
-- exceeds 255 chars. Widen all three to TEXT to prevent "value too long" crashes.
-- Safe to run: TEXT accepts anything varchar(255) did.

ALTER TABLE questions ALTER COLUMN text              TYPE TEXT;
ALTER TABLE questions ALTER COLUMN expected_method   TYPE TEXT;
ALTER TABLE questions ALTER COLUMN sample_answer     TYPE TEXT;