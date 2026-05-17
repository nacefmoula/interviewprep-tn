-- V1__create_users.sql
-- Création de la table users
-- Membre 2 — Infrastructure

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'INACTIVE', 
    'SUSPENDED',
    'PENDING_VERIFICATION'
);

CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id     VARCHAR(36)     NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    status          user_status     NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE,

    CONSTRAINT users_email_unique       UNIQUE (email),
    CONSTRAINT users_keycloak_id_unique UNIQUE (keycloak_id)
);

CREATE INDEX idx_users_keycloak_id
    ON users (keycloak_id);

CREATE INDEX idx_users_email
    ON users (email);

CREATE INDEX idx_users_status
    ON users (status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_users_name
    ON users (lower(last_name), lower(first_name));

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

COMMENT ON TABLE  users IS 'Profils utilisateurs liés à Keycloak';
COMMENT ON COLUMN users.keycloak_id IS 'sub claim du JWT — lien avec Keycloak';
COMMENT ON COLUMN users.deleted_at  IS 'NULL = actif, non-NULL = supprimé (soft delete)';
