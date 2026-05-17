CREATE TABLE post_bookmarks (
    id         BIGSERIAL PRIMARY KEY,
    user_keycloak_id VARCHAR(255) NOT NULL,
    post_id    BIGINT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_post_bookmark UNIQUE (user_keycloak_id, post_id)
);

CREATE INDEX idx_bookmarks_user ON post_bookmarks(user_keycloak_id);
CREATE INDEX idx_bookmarks_post ON post_bookmarks(post_id);
