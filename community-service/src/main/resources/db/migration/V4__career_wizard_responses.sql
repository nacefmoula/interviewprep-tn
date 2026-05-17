CREATE TABLE career_wizard_responses (
    id                  BIGSERIAL PRIMARY KEY,
    user_keycloak_id    VARCHAR(255) NOT NULL UNIQUE,
    "current_role"      VARCHAR(100),
    target_roles        TEXT,
    experience_years    INT,
    career_level        VARCHAR(20),
    skills              TEXT,
    target_industries   TEXT,
    work_type           VARCHAR(20),
    availability        VARCHAR(20),
    salary_min          INT,
    salary_max          INT,
    completed           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wizard_user ON career_wizard_responses(user_keycloak_id);
CREATE INDEX idx_wizard_completed ON career_wizard_responses(completed);
