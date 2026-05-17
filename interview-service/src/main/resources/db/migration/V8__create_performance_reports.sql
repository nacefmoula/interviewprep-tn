-- V8__create_performance_reports.sql
CREATE TABLE performance_reports (
    id                              BIGSERIAL PRIMARY KEY,
    session_id                      BIGINT          NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
    global_score                    DOUBLE PRECISION,
    communication_score             DOUBLE PRECISION,
    content_quality_score           DOUBLE PRECISION,
    stress_management_score         DOUBLE PRECISION,
    confidence_score                DOUBLE PRECISION,
    preparation_level               VARCHAR(50),
    top_strengths                   TEXT,
    areas_for_improvement           TEXT,
    actionable_recommendations      TEXT,
    estimated_sessions_to_next_level INTEGER,
    generated_at                    TIMESTAMP NOT NULL DEFAULT now()
);