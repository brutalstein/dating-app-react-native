package org.api.backend.repos;

import org.api.backend.entity.Conversation;
import org.api.backend.entity.MatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    Optional<Conversation> findByMatch(MatchEntity match);
}
