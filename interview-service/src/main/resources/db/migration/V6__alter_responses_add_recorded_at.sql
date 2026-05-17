-- V6__alter_responses_add_recorded_at.sql
ALTER TABLE responses
    ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP NOT NULL DEFAULT now();