package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.service.CurrentUserService;
import org.api.backend.service.SocialService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final SocialService socialService;
    private final CurrentUserService currentUserService;

    @PostMapping("/{notificationId}/read")
    public void markRead(@PathVariable UUID notificationId) {
        socialService.markNotificationRead(currentUserService.getCurrentUser(), notificationId);
    }

    @PostMapping("/read-all")
    public void markAllRead() {
        socialService.markAllNotificationsRead(currentUserService.getCurrentUser());
    }
}
