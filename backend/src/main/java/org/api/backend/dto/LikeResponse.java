package org.api.backend.dto;

import java.util.UUID;

public record LikeResponse(boolean matched, UUID matchId, UUID conversationId, String message) {}
