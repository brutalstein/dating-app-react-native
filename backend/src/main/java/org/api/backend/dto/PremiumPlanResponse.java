package org.api.backend.dto;

import java.math.BigDecimal;

public record PremiumPlanResponse(
        String id,
        String title,
        String description,
        BigDecimal price,
        String currency,
        String period,
        boolean recommended
) {
}
