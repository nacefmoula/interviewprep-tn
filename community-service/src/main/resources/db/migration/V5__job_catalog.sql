CREATE TABLE job_catalog (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    company         VARCHAR(200),
    location        VARCHAR(150),
    description     TEXT,
    required_skills TEXT,
    industry        VARCHAR(100),
    career_level    VARCHAR(20),
    work_type       VARCHAR(20),
    salary_min      INT,
    salary_max      INT,
    job_url         VARCHAR(500),
    source          VARCHAR(30) NOT NULL DEFAULT 'STATIC',
    submitted_by    VARCHAR(255),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_active     ON job_catalog(active);
CREATE INDEX idx_job_source     ON job_catalog(source);
CREATE INDEX idx_job_industry   ON job_catalog(industry);
CREATE INDEX idx_job_level      ON job_catalog(career_level);
