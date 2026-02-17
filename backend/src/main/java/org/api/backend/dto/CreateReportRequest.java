package org.api.backend.dto;

import java.util.UUID;

public record CreateReportRequest(UUID targetUserId, String contentRef, String reason) {
}
