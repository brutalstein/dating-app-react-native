package org.api.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.service.AbuseProtectionService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketRateLimitInterceptor implements ChannelInterceptor {

    private final AbuseProtectionService abuseProtectionService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        String command = accessor.getCommand() != null ? accessor.getCommand().name() : null;
        
        if (command == null) {
            return message;
        }

        String actor = accessor.getUser() != null ? accessor.getUser().getName() : accessor.getSessionId();
        if (actor == null) {
            return message;
        }

        try {
            if (StompCommand.SEND.equals(accessor.getCommand())) {
                String destination = accessor.getDestination();
                if (destination == null) {
                    return message;
                }

                if (destination.startsWith("/app/chat.send")) {
                    abuseProtectionService.enforceMessageFloodLimit("ws-send:" + actor);
                } else if (destination.startsWith("/app/chat.typing")) {
                    abuseProtectionService.enforceHttpRateLimit("CRITICAL", "ws-typing:" + actor);
                } else if (destination.startsWith("/app/chat.delivered") || destination.startsWith("/app/chat.sync")) {
                    abuseProtectionService.enforceHttpRateLimit("CRITICAL", "ws-ack:" + actor);
                }
            } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                String destination = accessor.getSubscriptionId();
                if (destination != null && destination.contains("/queue/")) {
                    abuseProtectionService.enforceHttpRateLimit("CRITICAL", "ws-subscribe:" + actor);
                }
            } else if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                abuseProtectionService.enforceHttpRateLimit("CRITICAL", "ws-connect:" + actor);
            }
        } catch (Exception e) {
            log.warn("event=websocket_rate_limit_violated actor={} command={} error={}", 
                    actor, command, e.getMessage());
            throw e;
        }

        return message;
    }
}
