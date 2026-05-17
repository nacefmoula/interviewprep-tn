CREATE TABLE job_recommendations (
    id                  BIGSERIAL PRIMARY KEY,
    user_keycloak_id    VARCHAR(255) NOT NULL,
    job_id              BIGINT REFERENCES job_catalog(id) ON DELETE CASCADE,
    match_score         INT NOT NULL,
    match_reasons       TEXT,
    generated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rec_user  ON job_recommendations(user_keycloak_id);
CREATE INDEX idx_rec_score ON job_recommendations(match_score DESC);
