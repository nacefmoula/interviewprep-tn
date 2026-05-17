ALTER TABLE performance_reports
    ADD COLUMN IF NOT EXISTS hesitation_score       DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS stress_proxy_score     DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS behavioral_summary     TEXT,
    ADD COLUMN IF NOT EXISTS communication_summary  TEXT,
    ADD COLUMN IF NOT EXISTS stress_proxy_summary   TEXT;