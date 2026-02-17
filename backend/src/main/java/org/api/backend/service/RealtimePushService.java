package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.RealtimeEnvelope;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RealtimePushService {
    private final SimpMessagingTemplate messagingTemplate;

    public void sendToUser(String email, String eventType, Object payload) {
        messagingTemplate.convertAndSendToUser(
                email,
                "/queue/events",
                new RealtimeEnvelope(UUID.randomUUID(), eventType, LocalDateTime.now(), payload)
        );
    }
}
