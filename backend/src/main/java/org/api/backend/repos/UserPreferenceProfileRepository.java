package org.api.backend.repos;

import org.api.backend.entity.User;
import org.api.backend.entity.UserPreferenceProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserPreferenceProfileRepository extends JpaRepository<UserPreferenceProfile, UUID> {
    Optional<UserPreferenceProfile> findByUser(User user);
}
