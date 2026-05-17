-- Prevent silent deletion of all resources when a category is deleted.
-- Use RESTRICT so the database rejects the deletion and forces explicit cleanup.
ALTER TABLE resources DROP CONSTRAINT resources_category_id_fkey;
ALTER TABLE resources
    ADD CONSTRAINT resources_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES resource_categories(id) ON DELETE RESTRICT;
