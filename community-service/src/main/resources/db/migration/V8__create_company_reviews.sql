CREATE TABLE company_reviews (
    id                    BIGSERIAL PRIMARY KEY,
    author_keycloak_id    VARCHAR(255) NOT NULL,
    company_name_display  VARCHAR(255) NOT NULL,
    company_name_normalized VARCHAR(255) NOT NULL,
    role_title            VARCHAR(255) NOT NULL,
    interview_type        VARCHAR(50)  NOT NULL,
    difficulty            VARCHAR(50)  NOT NULL,
    outcome               VARCHAR(50)  NOT NULL,
    overall_rating        INTEGER      NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    review_text           TEXT         NOT NULL,
    process_description   TEXT,
    is_anonymous          BOOLEAN      NOT NULL DEFAULT FALSE,
    helpful_count         INTEGER      NOT NULL DEFAULT 0,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cr_company ON company_reviews(company_name_normalized);
CREATE INDEX idx_cr_author  ON company_reviews(author_keycloak_id);
