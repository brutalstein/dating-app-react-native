package org.api.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.service.PresenceService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketPresenceListener {
    private final PresenceService presenceService;

    @EventListener
    public void onConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal p = accessor.getUser();
        if (p != null) {
            presenceService.markOnline(p.getName());
            log.info("event=ws_connected actor={} sessionId={}", p.getName(), accessor.getSessionId());
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal p = accessor.getUser();
        if (p != null) {
            presenceService.markOffline(p.getName());
            log.warn("event=ws_disconnected actor={} sessionId={} closeStatus={}", p.getName(), accessor.getSessionId(), event.getCloseStatus());
        }
    }
}
