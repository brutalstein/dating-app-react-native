package org.api.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.api.backend.dto.PremiumCatalogResponse;
import org.api.backend.dto.PremiumPurchaseRequest;
import org.api.backend.dto.PremiumPurchaseResponse;
import org.api.backend.service.CurrentUserService;
import org.api.backend.service.PremiumService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/premium")
@RequiredArgsConstructor
public class PremiumController {
    private final PremiumService premiumService;
    private final CurrentUserService currentUserService;

    @GetMapping("/plans")
    public PremiumCatalogResponse getPlans() {
        return premiumService.getCatalog(currentUserService.getCurrentUser());
    }

    @PostMapping("/purchase")
    public PremiumPurchaseResponse purchase(@Valid @RequestBody PremiumPurchaseRequest request) {
        return premiumService.createCheckout(currentUserService.getCurrentUser(), request);
    }
}
