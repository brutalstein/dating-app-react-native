package org.api.backend.config;

import lombok.RequiredArgsConstructor;
import org.api.backend.service.AbuseProtectionService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebSocketRateLimitInterceptor implements ChannelInterceptor {

    private final AbuseProtectionService abuseProtectionService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (!StompCommand.SEND.equals(accessor.getCommand())) {
            return message;
        }

        String destination = accessor.getDestination();
        String actor = accessor.getUser() != null ? accessor.getUser().getName() : accessor.getSessionId();
        if (destination == null || actor == null) {
            return message;
        }

        if (destination.startsWith("/app/chat.send")) {
            abuseProtectionService.enforceMessageFloodLimit("ws-send:" + actor);
        } else if (destination.startsWith("/app/chat.typing")) {
            abuseProtectionService.enforceHttpRateLimit("CRITICAL", "ws-typing:" + actor);
        } else if (destination.startsWith("/app/chat.delivered") || destination.startsWith("/app/chat.sync")) {
            abuseProtectionService.enforceHttpRateLimit("CRITICAL", "ws-ack:" + actor);
        }

        return message;
    }
}
