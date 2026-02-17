package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.ConversationItemResponse;
import org.api.backend.dto.MessageResponse;
import org.api.backend.service.CurrentUserService;
import org.api.backend.service.SocialService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {
    private final SocialService socialService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<ConversationItemResponse> listConversations() {
        return socialService.listConversations(currentUserService.getCurrentUser());
    }

    @GetMapping("/{conversationId}/messages")
    public List<MessageResponse> getMessages(@PathVariable UUID conversationId) {
        return socialService.getMessages(currentUserService.getCurrentUser(), conversationId);
    }

    @PostMapping("/{conversationId}/read")
    public void markRead(@PathVariable UUID conversationId) {
        socialService.markConversationRead(currentUserService.getCurrentUser(), conversationId);
    }
}
