package org.api.backend.service.push;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class FcmPushProvider implements PushProvider {
    private final PushProperties pushProperties;
    private final RestClient restClient = RestClient.create();

    @Override
    public boolean supports(PushChannel channel) {
        return channel == PushChannel.FCM;
    }

    @Override
    public void send(PushMessage message) {
        if (pushProperties.fcmServerKey() == null || pushProperties.fcmServerKey().isBlank()) {
            return;
        }

        String url = (pushProperties.fcmUrl() == null || pushProperties.fcmUrl().isBlank())
                ? "https://fcm.googleapis.com/fcm/send"
                : pushProperties.fcmUrl();

        try {
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "key=" + pushProperties.fcmServerKey())
                    .body(Map.of(
                            "to", message.deviceToken(),
                            "notification", Map.of("title", message.title(), "body", message.body()),
                            "data", message.data() == null ? Map.of() : message.data()
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("FCM push failed: {}", e.getMessage());
        }
    }
}
