package org.api.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpsertPreferenceProfileRequest(
        @NotNull Boolean proactiveEnabled,
        @Valid List<PreferenceCriterionRequest> criteria
) {}
