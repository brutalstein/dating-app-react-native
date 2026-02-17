package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.DeliveryAckRequest;
import org.api.backend.dto.ExploreHubResponse;
import org.api.backend.dto.MessageResponse;
import org.api.backend.dto.SendMessageRequest;
import org.api.backend.dto.TypingEventRequest;
import org.api.backend.repos.UserRepository;
import org.api.backend.service.SocialService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class RealtimeMessageController {
    private final SocialService socialService;
    private final UserRepository userRepository;

    @MessageMapping("/chat.send")
    @SendToUser("/queue/ack")
    public MessageResponse send(@Payload SendMessageRequest request, Principal principal) {
        var user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return socialService.sendMessage(user, request.conversationId(), request.content(), request.clientMessageId());
    }

    @MessageMapping("/chat.delivered")
    @SendToUser("/queue/ack")
    public MessageResponse delivered(@Payload DeliveryAckRequest request, Principal principal) {
        var user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return socialService.markDelivered(user, request.conversationId(), request.messageId());
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingEventRequest request, Principal principal) {
        var user = userRepository.findByEmail(principal.getName()).orElseThrow();
        socialService.sendTyping(user, request.conversationId(), request.typing());
    }

    @MessageMapping("/chat.sync")
    @SendToUser("/queue/ack")
    public ExploreHubResponse sync(Principal principal) {
        var user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return socialService.buildExploreHub(user);
    }
}
