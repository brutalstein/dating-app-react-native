package org.api.backend.dto;

import org.api.backend.entity.DevicePlatform;

public record DeviceTokenUpsertRequest(DevicePlatform platform, String deviceToken, Boolean enabled) {
}
