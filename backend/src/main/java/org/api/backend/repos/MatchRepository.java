package org.api.backend.repos;

import org.api.backend.entity.MatchEntity;
import org.api.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatchRepository extends JpaRepository<MatchEntity, UUID> {
    List<MatchEntity> findByUserOneOrUserTwoOrderByCreatedAtDesc(User userOne, User userTwo);
    Optional<MatchEntity> findByIdAndUserOneOrIdAndUserTwo(UUID id1, User user1, UUID id2, User user2);
    boolean existsByUserOneAndUserTwo(User userOne, User userTwo);
}
