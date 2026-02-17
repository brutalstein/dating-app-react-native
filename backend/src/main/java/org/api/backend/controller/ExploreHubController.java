package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.ExploreHubResponse;
import org.api.backend.service.CurrentUserService;
import org.api.backend.service.SocialService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/explore-hub")
@RequiredArgsConstructor
public class ExploreHubController {
    private final SocialService socialService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ExploreHubResponse getExploreHub() {
        return socialService.buildExploreHub(currentUserService.getCurrentUser());
    }
}
