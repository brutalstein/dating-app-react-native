package org.api.backend.repos;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.api.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Boolean existsByEmail(String email);
    List<User> findByNpcTrue();
    List<User> findByNpcFalseAndOnboardingCompletedTrueAndVerifiedTrue();
}
