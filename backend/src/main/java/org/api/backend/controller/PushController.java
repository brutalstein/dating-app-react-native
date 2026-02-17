package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.DeviceTokenUpsertRequest;
import org.api.backend.dto.PushPreferenceRequest;
import org.api.backend.service.CurrentUserService;
import org.api.backend.service.PushNotificationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {
    private final PushNotificationService pushNotificationService;
    private final CurrentUserService currentUserService;

    @PostMapping("/devices")
    public void upsertDevice(@RequestBody DeviceTokenUpsertRequest request) {
        pushNotificationService.upsertDeviceToken(currentUserService.getCurrentUser(), request);
    }

    @PutMapping("/preferences")
    public void updatePreferences(@RequestBody PushPreferenceRequest request) {
        boolean enabled = request != null && Boolean.TRUE.equals(request.pushEnabled());
        pushNotificationService.setPushPreference(currentUserService.getCurrentUser(), enabled);
    }
}
