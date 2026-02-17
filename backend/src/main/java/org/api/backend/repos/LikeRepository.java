package org.api.backend.repos;

import org.api.backend.entity.LikeInteraction;
import org.api.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LikeRepository extends JpaRepository<LikeInteraction, UUID> {
    boolean existsBySenderAndReceiver(User sender, User receiver);
    Optional<LikeInteraction> findBySenderAndReceiver(User sender, User receiver);
}
