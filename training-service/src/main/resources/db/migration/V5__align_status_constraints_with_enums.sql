-- V5__align_status_constraints_with_enums.sql
-- Align database check constraints with Java enums.

ALTER TABLE training_paths
    DROP CONSTRAINT IF EXISTS chk_training_path_status;

ALTER TABLE training_paths
    ADD CONSTRAINT chk_training_path_status
        CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'));

ALTER TABLE training_modules
    DROP CONSTRAINT IF EXISTS chk_training_module_status;

ALTER TABLE training_modules
    ADD CONSTRAINT chk_training_module_status
        CHECK (status IN ('LOCKED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'));
