package org.api.backend.dto;

import java.util.List;

public record ExploreHubResponse(
        List<ConversationItemResponse> messages,
        List<NotificationResponse> notifications,
        List<ActivityResponse> activities,
        long unreadMessages,
        long unreadNotifications
) {}
