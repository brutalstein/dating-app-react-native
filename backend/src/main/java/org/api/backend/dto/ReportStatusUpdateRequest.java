package org.api.backend.dto;

import org.api.backend.entity.ModerationStatus;

public record ReportStatusUpdateRequest(ModerationStatus status) {
}
