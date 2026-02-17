CREATE TABLE IF NOT EXISTS user_preference_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    proactive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preference_criteria (
    profile_id UUID NOT NULL REFERENCES user_preference_profiles(id) ON DELETE CASCADE,
    criterion_key VARCHAR(64) NOT NULL,
    criterion_value VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL,
    weight INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    candidate_id UUID NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    actioned_at TIMESTAMP NULL
);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS score INTEGER NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reason TEXT NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reference_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_status_created_at ON recommendations(user_id, status, created_at DESC);
