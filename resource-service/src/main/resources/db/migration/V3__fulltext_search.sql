-- Full-text search index on resources.
-- Uses a generated TSVECTOR column (PostgreSQL 12+) with a GIN index.
-- Title is weighted A (higher relevance), description is weighted B.
-- 'simple' config works for any language (no stemming).

ALTER TABLE resources ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'B')
    ) STORED;

CREATE INDEX idx_resources_fts ON resources USING GIN(search_vector);
