package org.api.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String senderEmail,
        String content,
        String clientMessageId,
        LocalDateTime createdAt,
        LocalDateTime deliveredAt,
        LocalDateTime readAt
) {}
