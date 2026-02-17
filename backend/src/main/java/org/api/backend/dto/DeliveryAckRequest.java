package org.api.backend.dto;

import java.util.UUID;

public record DeliveryAckRequest(UUID conversationId, UUID messageId) {}
