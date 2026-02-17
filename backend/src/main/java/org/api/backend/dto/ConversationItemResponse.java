package org.api.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ConversationItemResponse(
        UUID conversationId,
        UUID matchId,
        UUID otherUserId,
        String otherUserName,
        String otherUserAvatar,
        String lastMessage,
        LocalDateTime lastMessageAt,
        long unreadCount
) {}
