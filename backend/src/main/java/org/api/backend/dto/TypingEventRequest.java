package org.api.backend.dto;

import java.util.UUID;

public record TypingEventRequest(UUID conversationId, boolean typing) {}
