package org.api.backend.service.push;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.push")
public record PushProperties(
        String fcmServerKey,
        String fcmUrl,
        String apnsKeyId,
        String apnsTeamId,
        String apnsBundleId,
        String apnsPrivateKey,
        boolean apnsSandbox,
        boolean enabled
) {
}
