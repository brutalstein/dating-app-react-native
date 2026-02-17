package org.api.backend.repos;

import org.api.backend.entity.NotificationEntity;
import org.api.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {
    List<NotificationEntity> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndReadFalse(User user);
}
