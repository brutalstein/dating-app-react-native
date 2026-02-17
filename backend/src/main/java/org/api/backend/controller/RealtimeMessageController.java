package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.MessageResponse;
import org.api.backend.dto.SendMessageRequest;
import org.api.backend.service.SocialService;
import org.api.backend.repos.UserRepository;
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
        return socialService.sendMessage(user, request.conversationId(), request.content());
    }
}
