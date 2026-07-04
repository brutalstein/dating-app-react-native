-- V4__user_profile_enhancements.sql
-- This migration was missing in sequence. Adding user profile enhancements.

-- Add bio and verification status to users table if not exists
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Add height unit preference
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS height_unit VARCHAR(10) DEFAULT 'CM';

-- Create index for active users
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at DESC);

-- Add constraint for relationship_intent values
ALTER TABLE users 
    ADD CONSTRAINT chk_relationship_intent 
    CHECK (relationship_intent IN ('CASUAL', 'SERIOUS', 'MARRIAGE', 'FRIENDSHIP') OR relationship_intent IS NULL);
