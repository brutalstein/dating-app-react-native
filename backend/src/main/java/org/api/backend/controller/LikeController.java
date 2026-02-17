package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.LikeResponse;
import org.api.backend.service.CurrentUserService;
import org.api.backend.service.SocialService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/likes")
@RequiredArgsConstructor
public class LikeController {
    private final SocialService socialService;
    private final CurrentUserService currentUserService;

    @PostMapping("/{targetUserId}")
    public LikeResponse sendLike(@PathVariable UUID targetUserId) {
        return socialService.sendLike(currentUserService.getCurrentUser(), targetUserId);
    }
}
