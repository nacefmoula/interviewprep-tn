-- V1__create_users.sql
-- Complete users table for InterviewPrep TN

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id                              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id                     VARCHAR(36)     NOT NULL,
    email                           VARCHAR(255)    NOT NULL,
    role                            VARCHAR(20)     NOT NULL DEFAULT 'USER',
    first_name                      VARCHAR(100),
    last_name                       VARCHAR(100),
    phone_number                    VARCHAR(20),
    city                            VARCHAR(100),
    bio                             TEXT,
    avatar_url                      VARCHAR(500),
    karma_points                    INTEGER         NOT NULL DEFAULT 0,
    is_verified                     BOOLEAN         NOT NULL DEFAULT FALSE,
    status                          VARCHAR(30)     NOT NULL DEFAULT 'PENDING_VERIFICATION',
    plan                            VARCHAR(20)     NOT NULL DEFAULT 'FREE',
    simulations_used_this_month     INTEGER         NOT NULL DEFAULT 0,
    simulations_limit               INTEGER         NOT NULL DEFAULT 3,
    subscription_active             BOOLEAN         NOT NULL DEFAULT FALSE,
    subscription_start              TIMESTAMP WITH TIME ZONE,
    subscription_end                TIMESTAMP WITH TIME ZONE,
    preferred_language              VARCHAR(10)              DEFAULT 'fr',
    email_notifications_enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
    push_notifications_enabled      BOOLEAN         NOT NULL DEFAULT FALSE,
    profile_visible                 BOOLEAN         NOT NULL DEFAULT TRUE,
    preferred_industry              VARCHAR(50),
    experiences_json                TEXT,
    educations_json                 TEXT,
    last_login_at                   TIMESTAMP WITH TIME ZONE,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at                      TIMESTAMP WITH TIME ZONE,

    CONSTRAINT users_email_unique       UNIQUE (email),
    CONSTRAINT users_keycloak_id_unique UNIQUE (keycloak_id)
);

CREATE INDEX IF NOT EXISTS idx_users_keycloak_id ON users (keycloak_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_name ON users (lower(last_name), lower(first_name));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
