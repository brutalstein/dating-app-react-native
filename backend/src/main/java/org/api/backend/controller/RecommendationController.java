package org.api.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.api.backend.dto.PreferenceProfileResponse;
import org.api.backend.dto.RecommendationActionRequest;
import org.api.backend.dto.UpsertPreferenceProfileRequest;
import org.api.backend.entity.User;
import org.api.backend.service.CurrentUserService;
import org.api.backend.service.RecommendationService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {
    private final RecommendationService recommendationService;
    private final CurrentUserService currentUserService;

    @GetMapping("/preferences")
    public PreferenceProfileResponse getPreferences() {
        User user = currentUserService.getCurrentUser();
        return recommendationService.getProfile(user);
    }

    @PutMapping("/preferences")
    public PreferenceProfileResponse upsertPreferences(@Valid @RequestBody UpsertPreferenceProfileRequest request) {
        User user = currentUserService.getCurrentUser();
        return recommendationService.upsertProfile(user, request);
    }

    @PostMapping("/scan")
    public Map<String, String> triggerScan() {
        User user = currentUserService.getCurrentUser();
        recommendationService.triggerProactiveScanAsync(user.getId());
        return Map.of("message", "Proaktif tarama başlatıldı");
    }

    @PostMapping("/{recommendationId}/action")
    public Map<String, String> action(@PathVariable UUID recommendationId, @Valid @RequestBody RecommendationActionRequest request) {
        User user = currentUserService.getCurrentUser();
        recommendationService.applyAction(user, recommendationId, request.action());
        return Map.of("message", "Aksiyon kaydedildi");
    }
}
