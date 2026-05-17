-- Soft-delete support for resources.
-- Adds deleted_at timestamp; replaces the global unique constraint on url
-- with a partial one that only applies to non-deleted rows.

ALTER TABLE resources ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- Drop the old global unique constraint (which would block URL reuse after soft-delete).
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_url_key;

-- Partial unique index: only non-deleted resources must have unique URLs.
CREATE UNIQUE INDEX idx_resources_url_active ON resources(url) WHERE deleted_at IS NULL;
