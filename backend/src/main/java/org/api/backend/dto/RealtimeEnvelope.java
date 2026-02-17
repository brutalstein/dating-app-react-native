package org.api.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record RealtimeEnvelope(
        UUID eventId,
        String eventType,
        LocalDateTime occurredAt,
        Object payload
) {}
