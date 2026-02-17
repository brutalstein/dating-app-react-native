CREATE UNIQUE INDEX IF NOT EXISTS uk_messages_retry_dedup
    ON messages(conversation_id, sender_id, client_message_id)
    WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON notifications(user_id, read);
