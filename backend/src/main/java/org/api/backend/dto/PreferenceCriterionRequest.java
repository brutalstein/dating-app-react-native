package org.api.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PreferenceCriterionRequest(
        @NotBlank String key,
        @NotBlank String value,
        @NotNull Boolean mustHave,
        @NotNull @Min(1) @Max(100) Integer weight
) {}
