package org.api.backend.repos;

import org.api.backend.entity.RecommendationEntity;
import org.api.backend.entity.RecommendationStatus;
import org.api.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecommendationRepository extends JpaRepository<RecommendationEntity, UUID> {
    Optional<RecommendationEntity> findByIdAndUser(UUID id, User user);
    List<RecommendationEntity> findByUserAndStatusOrderByCreatedAtDesc(User user, RecommendationStatus status);
    boolean existsByUserAndCandidateAndStatusAndCreatedAtAfter(User user, User candidate, RecommendationStatus status, LocalDateTime createdAt);
}
