package org.api.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record RecommendationActionRequest(@NotBlank String action) {}
