package org.api.backend.repos;

import org.api.backend.entity.ModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ModerationActionRepository extends JpaRepository<ModerationAction, UUID> {
}
