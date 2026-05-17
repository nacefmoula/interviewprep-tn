CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    industry VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    level VARCHAR(50) NOT NULL,
    industry VARCHAR(50) NOT NULL,
    url VARCHAR(255) UNIQUE NOT NULL,
    thumb_url VARCHAR(255),
    category_id UUID NOT NULL REFERENCES resource_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_resources_category ON resources(category_id);
CREATE INDEX idx_resources_industry ON resources(industry);
CREATE INDEX idx_resources_level ON resources(level);
CREATE INDEX idx_bookmarks_user ON user_bookmarks(user_id);
