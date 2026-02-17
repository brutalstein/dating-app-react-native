package org.api.backend.dto;

import java.util.UUID;

public record SendMessageRequest(UUID conversationId, String content) {}
