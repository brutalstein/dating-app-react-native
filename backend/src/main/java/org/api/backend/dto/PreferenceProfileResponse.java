package org.api.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PreferenceProfileResponse(
        UUID id,
        Boolean proactiveEnabled,
        LocalDateTime updatedAt,
        List<PreferenceCriterionResponse> criteria
) {
    public record PreferenceCriterionResponse(
            String key,
            String value,
            Boolean mustHave,
            Integer weight
    ) {}
}
