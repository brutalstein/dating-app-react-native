package org.api.backend.dto;

import org.api.backend.entity.ModerationActionType;

import java.util.UUID;

public record ModerationActionRequest(UUID targetUserId, ModerationActionType actionType, String reason) {
}
