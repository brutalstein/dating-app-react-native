package org.api.backend.repos;

import org.api.backend.entity.ActivityEntity;
import org.api.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<ActivityEntity, UUID> {
    List<ActivityEntity> findByUserOrderByCreatedAtDesc(User user);
}
