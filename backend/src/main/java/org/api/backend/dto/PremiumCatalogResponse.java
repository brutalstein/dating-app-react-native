package org.api.backend.dto;

import java.util.List;

public record PremiumCatalogResponse(
        List<PremiumPlanResponse> plans,
        String activePlanId,
        boolean premiumActive
) {
}
