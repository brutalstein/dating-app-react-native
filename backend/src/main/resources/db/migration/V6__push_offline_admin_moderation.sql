ALTER TABLE users
    ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS banned_reason VARCHAR(255);

CREATE TABLE IF NOT EXISTS user_device_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(16) NOT NULL,
    device_token TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE (user_id, platform, device_token)
);

CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user_enabled ON user_device_tokens(user_id, enabled);

CREATE TABLE IF NOT EXISTS moderation_reports (
    id UUID PRIMARY KEY,
    reporter_user_id UUID REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    content_ref TEXT,
    reason TEXT NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by_user_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY,
    target_user_id UUID NOT NULL REFERENCES users(id),
    action_type VARCHAR(24) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL,
    actor_user_id UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID NOT NULL REFERENCES users(id),
    action_key VARCHAR(120) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created ON moderation_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_target_created ON moderation_actions(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON admin_audit_logs(actor_user_id, created_at DESC);
