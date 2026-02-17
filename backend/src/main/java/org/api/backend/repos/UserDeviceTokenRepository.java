package org.api.backend.repos;

import org.api.backend.entity.DevicePlatform;
import org.api.backend.entity.User;
import org.api.backend.entity.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, UUID> {
    Optional<UserDeviceToken> findByUserAndPlatformAndDeviceToken(User user, DevicePlatform platform, String deviceToken);
    List<UserDeviceToken> findByUserAndEnabledTrue(User user);
}
