package org.api.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ActivityResponse(
        UUID id,
        String type,
        String summary,
        UUID actorId,
        String actorName,
        String actorAvatar,
        LocalDateTime createdAt
) {}
