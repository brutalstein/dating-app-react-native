package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.DeviceTokenUpsertRequest;
import org.api.backend.entity.DevicePlatform;
import org.api.backend.entity.User;
import org.api.backend.entity.UserDeviceToken;
import org.api.backend.repos.UserDeviceTokenRepository;
import org.api.backend.repos.UserRepository;
import org.api.backend.service.push.PushChannel;
import org.api.backend.service.push.PushMessage;
import org.api.backend.service.push.PushProperties;
import org.api.backend.service.push.PushProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PushNotificationService {
    private final UserDeviceTokenRepository userDeviceTokenRepository;
    private final UserRepository userRepository;
    private final List<PushProvider> providers;
    private final PushProperties pushProperties;

    @Transactional
    public void upsertDeviceToken(User user, DeviceTokenUpsertRequest request) {
        if (request == null || request.platform() == null || request.deviceToken() == null || request.deviceToken().isBlank()) {
            throw new RuntimeException("platform and deviceToken are required");
        }

        UserDeviceToken token = userDeviceTokenRepository
                .findByUserAndPlatformAndDeviceToken(user, request.platform(), request.deviceToken().trim())
                .orElseGet(UserDeviceToken::new);

        if (token.getId() == null) {
            token.setUser(user);
            token.setPlatform(request.platform());
            token.setDeviceToken(request.deviceToken().trim());
            token.setCreatedAt(LocalDateTime.now());
        }

        token.setEnabled(request.enabled() == null || request.enabled());
        token.setUpdatedAt(LocalDateTime.now());
        userDeviceTokenRepository.save(token);
    }

    @Transactional
    public void setPushPreference(User user, boolean enabled) {
        user.setPushEnabled(enabled);
        userRepository.save(user);
    }

    public void notifyEvent(User user, String title, String body, Map<String, String> data) {
        if (!pushProperties.enabled() || !Boolean.TRUE.equals(user.getPushEnabled()) || Boolean.TRUE.equals(user.getBanned())) {
            return;
        }

        for (UserDeviceToken token : userDeviceTokenRepository.findByUserAndEnabledTrue(user)) {
            PushChannel channel = token.getPlatform() == DevicePlatform.IOS ? PushChannel.APNS : PushChannel.FCM;
            PushMessage message = new PushMessage(channel, token.getDeviceToken(), title, body, data);
            providers.stream().filter(p -> p.supports(channel)).findFirst().ifPresent(p -> p.send(message));
        }
    }
}
