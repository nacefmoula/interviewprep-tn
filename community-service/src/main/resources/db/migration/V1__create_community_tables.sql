CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    author_keycloak_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    industry VARCHAR(50),
    tags VARCHAR(500),
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_reported BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_keycloak_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id VARCHAR(50),
    upvotes INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    is_reported BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    follower_keycloak_id VARCHAR(255) NOT NULL,
    following_keycloak_id VARCHAR(255) NOT NULL,
    followed_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_follow UNIQUE (follower_keycloak_id, following_keycloak_id)
);

CREATE INDEX idx_posts_author ON posts(author_keycloak_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_industry ON posts(industry);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_follows_follower ON follows(follower_keycloak_id);
CREATE INDEX idx_follows_following ON follows(following_keycloak_id);
