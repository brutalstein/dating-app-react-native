package org.api.backend.dto;

public record PremiumPurchaseResponse(
        String checkoutId,
        String checkoutUrl,
        String status,
        String provider,
        String planId,
        String message
) {
}
