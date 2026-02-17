package org.api.backend.repos;

import org.api.backend.entity.Conversation;
import org.api.backend.entity.MessageEntity;
import org.api.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<MessageEntity, UUID> {
    List<MessageEntity> findByConversationOrderByCreatedAtAsc(Conversation conversation);
    MessageEntity findTopByConversationOrderByCreatedAtDesc(Conversation conversation);
    long countByConversationAndSenderNotAndReadAtIsNull(Conversation conversation, User sender);
    List<MessageEntity> findByConversationAndSenderNotAndReadAtIsNull(Conversation conversation, User sender);
}
