CREATE TABLE karma_scores (
    id BIGSERIAL PRIMARY KEY,
    keycloak_id VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    total_karma INTEGER NOT NULL DEFAULT 0,
    posts_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    upvotes_received INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_karma_keycloak_id ON karma_scores(keycloak_id);
CREATE INDEX idx_karma_total ON karma_scores(total_karma DESC);
