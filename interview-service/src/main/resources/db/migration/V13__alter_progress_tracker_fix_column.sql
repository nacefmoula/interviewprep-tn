-- V13__alter_progress_tracker_fix_column.sql
ALTER TABLE progress_tracker
    RENAME COLUMN current_preparation_level TO current_level;