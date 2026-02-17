package org.api.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record PremiumPurchaseRequest(
        @NotBlank(message = "planId is required")
        String planId
) {
}
