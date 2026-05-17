
-- V6__add_passkey_fields_to_users.sql
-- Tracks whether a user has registered a passkey (UI display only)
-- Authentication truth remains in Keycloak — this is informational only

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS passkey_registered      BOOLEAN                  NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS passkey_registered_at   TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_passkey ON users (passkey_registered) WHERE deleted_at IS NULL;