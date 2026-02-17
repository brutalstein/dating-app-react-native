package org.api.backend.service;

import org.api.backend.dto.PremiumCatalogResponse;
import org.api.backend.dto.PremiumPlanResponse;
import org.api.backend.dto.PremiumPurchaseRequest;
import org.api.backend.dto.PremiumPurchaseResponse;
import org.api.backend.entity.Membership;
import org.api.backend.entity.User;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class PremiumService {

    public PremiumCatalogResponse getCatalog(User user) {
        List<PremiumPlanResponse> plans = List.of(
                new PremiumPlanResponse("monthly", "Aylık Premium", "Tüm premium özellikler, aylık yenilenir.", new BigDecimal("149.99"), "TRY", "MONTH", false),
                new PremiumPlanResponse("quarterly", "3 Aylık Premium", "%20 avantajlı paket.", new BigDecimal("359.99"), "TRY", "QUARTER", true),
                new PremiumPlanResponse("yearly", "Yıllık Premium", "En iyi fiyat, tek ödeme.", new BigDecimal("999.99"), "TRY", "YEAR", false)
        );

        boolean premiumActive = user.getMembershipType() == Membership.PREMIUM;
        String activePlanId = premiumActive ? "monthly" : null;
        return new PremiumCatalogResponse(plans, activePlanId, premiumActive);
    }

    public PremiumPurchaseResponse createCheckout(User user, PremiumPurchaseRequest request) {
        String planId = request.planId().trim().toLowerCase();
        if (!List.of("monthly", "quarterly", "yearly").contains(planId)) {
            throw new RuntimeException("Unknown premium plan: " + request.planId());
        }

        String checkoutId = "chk_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String checkoutUrl = "https://payments.bloom.app/checkout/" + checkoutId;

        // Integration hook point:
        // Here, replace mocked checkout creation with PSP/provider API call and persist transaction state.
        return new PremiumPurchaseResponse(
                checkoutId,
                checkoutUrl,
                "PENDING",
                "mock-gateway",
                planId,
                "Checkout created successfully"
        );
    }
}
