package org.api.backend.service.push;

import java.util.Map;

public record PushMessage(
        PushChannel channel,
        String deviceToken,
        String title,
        String body,
        Map<String, String> data
) {
}
