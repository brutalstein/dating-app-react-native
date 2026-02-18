package org.api.backend.service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.api.backend.dto.*;
import org.api.backend.entity.*;
import org.api.backend.repos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SocialService {
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final MatchRepository matchRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityRepository activityRepository;
    private final RealtimePushService realtimePushService;
    private final PresenceService presenceService;
    private final PushNotificationService pushNotificationService;
    private final SafetyService safetyService;
    private final PremiumService premiumService;
    private final ObjectMapper objectMapper;
    private final ThreadLocal<Boolean> teaserSeedInProgress = ThreadLocal.withInitial(() -> false);

    @Transactional
    public LikeResponse sendLike(User sender, UUID targetUserId) {
        User receiver = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        if (sender.getId().equals(receiver.getId())) {
            throw new RuntimeException("You cannot like yourself");
        }
        if (safetyService.isBlockedEitherDirection(sender, receiver)) {
            throw new RuntimeException("Bu kullanıcı ile etkileşim engellenmiş.");
        }

        if (!likeRepository.existsBySenderAndReceiver(sender, receiver)) {
            LikeInteraction like = new LikeInteraction();
            like.setSender(sender);
            like.setReceiver(receiver);
            likeRepository.save(like);
        }

        createNotification(receiver, NotificationType.LIKE, "Yeni beğeni", sender.getFirstName() + " seni beğendi.");
        createActivity(receiver, sender, ActivityType.LIKE_RECEIVED, sender.getFirstName() + " profilini beğendi.");
        pushNotificationService.notifyEvent(receiver, "Yeni beğeni", sender.getFirstName() + " seni beğendi.", Map.of("event", "LIKE_RECEIVED", "senderId", sender.getId().toString()));

        realtimePushService.sendToUser(receiver.getEmail(), "LIKE_RECEIVED", buildExploreHub(receiver));

        boolean mutual = likeRepository.existsBySenderAndReceiver(receiver, sender);
        if (!mutual) {
            return new LikeResponse(false, null, null, "Like sent");
        }

        User userOne = sender.getId().toString().compareTo(receiver.getId().toString()) <= 0 ? sender : receiver;
        User userTwo = userOne == sender ? receiver : sender;

        MatchEntity match = new MatchEntity();
        match.setUserOne(userOne);
        match.setUserTwo(userTwo);
        match = matchRepository.save(match);

        Conversation conversation = new Conversation();
        conversation.setMatch(match);
        conversation = conversationRepository.save(conversation);

        createNotification(sender, NotificationType.MATCH, "Eşleşme!", receiver.getFirstName() + " ile eşleştiniz.");
        createNotification(receiver, NotificationType.MATCH, "Eşleşme!", sender.getFirstName() + " ile eşleştiniz.");

        createActivity(sender, receiver, ActivityType.MATCH_CREATED, receiver.getFirstName() + " ile eşleşme oldu.");
        createActivity(receiver, sender, ActivityType.MATCH_CREATED, sender.getFirstName() + " ile eşleşme oldu.");
        pushNotificationService.notifyEvent(sender, "Yeni eşleşme", receiver.getFirstName() + " ile eşleştiniz.", Map.of("event", "MATCH_CREATED", "matchId", match.getId().toString()));
        pushNotificationService.notifyEvent(receiver, "Yeni eşleşme", sender.getFirstName() + " ile eşleştiniz.", Map.of("event", "MATCH_CREATED", "matchId", match.getId().toString()));

        realtimePushService.sendToUser(sender.getEmail(), "MATCH_CREATED", buildExploreHub(sender));
        realtimePushService.sendToUser(receiver.getEmail(), "MATCH_CREATED", buildExploreHub(receiver));

        return new LikeResponse(true, match.getId(), conversation.getId(), "It's a match");
    }

    @Transactional(readOnly = true)
    public List<ConversationItemResponse> listConversations(User user) {
        return conversationRepository.findAll().stream()
                .filter(c -> {
                    if (Boolean.TRUE.equals(c.getTeaserConversation())) {
                        return c.getTeaserOwnerUser() != null && c.getTeaserOwnerUser().getId().equals(user.getId());
                    }
                    MatchEntity m = c.getMatch();
                    return m != null && (m.getUserOne().getId().equals(user.getId()) || m.getUserTwo().getId().equals(user.getId()));
                })
                .map(c -> {
                    User other;
                    UUID matchId = null;
                    if (Boolean.TRUE.equals(c.getTeaserConversation())) {
                        other = c.getTeaserNpcUser();
                    } else {
                        MatchEntity match = c.getMatch();
                        if (match == null) return null;
                        matchId = match.getId();
                        other = match.getUserOne().getId().equals(user.getId()) ? match.getUserTwo() : match.getUserOne();
                    }

                    if (other == null) return null;
                    if (safetyService.isBlockedEitherDirection(user, other)) return null;

                    MessageEntity last = messageRepository.findTopByConversationOrderByCreatedAtDesc(c);
                    String lastMessage = last != null ? last.getContent() : "";
                    LocalDateTime lastAt = last != null ? last.getCreatedAt() : c.getCreatedAt();
                    long unread = messageRepository.countByConversationAndSenderNotAndReadAtIsNull(c, user);
                    return new ConversationItemResponse(c.getId(), matchId, other.getId(), other.getFirstName(),
                            other.getPhotoUrls().isEmpty() ? null : other.getPhotoUrls().get(0),
                            presenceService.isOnline(other), other.getLastSeen(), lastMessage, lastAt, unread,
                            c.getTeaserConversation(), c.getTeaserProfileLocked(), c.getTeaserCtaText());
                })
                .filter(java.util.Objects::nonNull)
                .sorted((a, b) -> b.lastMessageAt().compareTo(a.lastMessageAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(User user, UUID conversationId) {
        Conversation conversation = getAuthorizedConversation(user, conversationId);
        return messageRepository.findByConversationOrderByCreatedAtAsc(conversation)
                .stream()
                .map(this::toMessageResponse)
                .toList();
    }

    @Transactional
    public MessageResponse sendMessage(User user, UUID conversationId, String content, String clientMessageId) {
        if (content == null || content.trim().isBlank()) throw new RuntimeException("Message empty");

        Conversation conversation = getAuthorizedConversation(user, conversationId);
        if (Boolean.TRUE.equals(conversation.getTeaserConversation()) && !premiumService.hasFeature(user, "profile_unlock")) {
            throw new RuntimeException("Teaser sohbetlerde mesaj gönderimi premium ile açılır.");
        }

        MatchEntity match = conversation.getMatch();
        if (match == null) {
            throw new RuntimeException("Conversation has no match context");
        }
        User recipient = match.getUserOne().getId().equals(user.getId()) ? match.getUserTwo() : match.getUserOne();
        if (safetyService.isBlockedEitherDirection(user, recipient)) {
            throw new RuntimeException("Bu kullanıcı ile mesajlaşma engellenmiş.");
        }

        if (clientMessageId != null && !clientMessageId.isBlank()) {
            var existing = messageRepository.findByConversationAndSenderAndClientMessageId(conversation, user, clientMessageId.trim());
            if (existing.isPresent()) {
                return toMessageResponse(existing.get());
            }
        }

        MessageEntity message = new MessageEntity();
        message.setConversation(conversation);
        message.setSender(user);
        message.setContent(content.trim());
        message.setClientMessageId(clientMessageId == null ? null : clientMessageId.trim());
        if (presenceService.isOnline(recipient)) {
            message.setDeliveredAt(LocalDateTime.now());
        }
        message = messageRepository.save(message);

        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        createNotification(recipient, NotificationType.MESSAGE, "Yeni mesaj", user.getFirstName() + ": " + message.getContent());
        createActivity(recipient, user, ActivityType.MESSAGE_RECEIVED, user.getFirstName() + " sana mesaj gönderdi.");
        pushNotificationService.notifyEvent(recipient, "Yeni mesaj", user.getFirstName() + ": " + message.getContent(), Map.of("event", "MESSAGE_RECEIVED", "conversationId", conversationId.toString()));

        var response = toMessageResponse(message);
        realtimePushService.sendToUser(recipient.getEmail(), "MESSAGE_RECEIVED", response);
        realtimePushService.sendToUser(user.getEmail(), "MESSAGE_SENT", response);
        realtimePushService.sendToUser(recipient.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(recipient));
        realtimePushService.sendToUser(user.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(user));

        return response;
    }

    @Transactional
    public MessageResponse markDelivered(User user, UUID conversationId, UUID messageId) {
        Conversation conversation = getAuthorizedConversation(user, conversationId);
        MessageEntity message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getConversation().getId().equals(conversation.getId())) {
            throw new RuntimeException("Message conversation mismatch");
        }
        if (message.getSender().getId().equals(user.getId())) {
            return toMessageResponse(message);
        }

        if (message.getDeliveredAt() == null) {
            message.setDeliveredAt(LocalDateTime.now());
            messageRepository.save(message);
        }

        User sender = message.getSender();
        MessageResponse payload = toMessageResponse(message);
        realtimePushService.sendToUser(sender.getEmail(), "MESSAGE_STATUS_UPDATED", payload);
        return payload;
    }

    @Transactional
    public void sendTyping(User user, UUID conversationId, boolean typing) {
        Conversation conversation = getAuthorizedConversation(user, conversationId);
        User recipient;
        if (Boolean.TRUE.equals(conversation.getTeaserConversation())) {
            recipient = conversation.getTeaserNpcUser();
            if (recipient == null) {
                return;
            }
        } else {
            MatchEntity match = conversation.getMatch();
            if (match == null) return;
            recipient = match.getUserOne().getId().equals(user.getId()) ? match.getUserTwo() : match.getUserOne();
        }

        realtimePushService.sendToUser(recipient.getEmail(), "TYPING_UPDATED", Map.of(
                "conversationId", conversationId,
                "userId", user.getId(),
                "typing", typing,
                "at", LocalDateTime.now()
        ));
    }

    @Transactional
    public void markConversationRead(User user, UUID conversationId) {
        Conversation conversation = getAuthorizedConversation(user, conversationId);
        List<MessageEntity> unread = messageRepository.findByConversationAndSenderNotAndReadAtIsNull(conversation, user);
        if (unread.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        unread.forEach(m -> {
            if (m.getDeliveredAt() == null) m.setDeliveredAt(now);
            m.setReadAt(now);
        });
        messageRepository.saveAll(unread);

        User other;
        if (Boolean.TRUE.equals(conversation.getTeaserConversation())) {
            other = conversation.getTeaserNpcUser();
            if (other == null) {
                return;
            }
        } else {
            MatchEntity match = conversation.getMatch();
            if (match == null) return;
            other = match.getUserOne().getId().equals(user.getId()) ? match.getUserTwo() : match.getUserOne();
        }

        realtimePushService.sendToUser(other.getEmail(), "MESSAGES_READ", Map.of(
                "conversationId", conversationId,
                "readerId", user.getId(),
                "messageIds", unread.stream().map(MessageEntity::getId).toList(),
                "readAt", now
        ));
        realtimePushService.sendToUser(user.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(user));
        realtimePushService.sendToUser(other.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(other));
    }

    @Transactional
    public void markNotificationRead(User user, UUID notificationId) {
        NotificationEntity notification = notificationRepository.findByIdAndUser(notificationId, user)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
            realtimePushService.sendToUser(user.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(user));
        }
    }

    @Transactional
    public void markAllNotificationsRead(User user) {
        var unread = notificationRepository.findByUserAndReadFalse(user);
        if (unread.isEmpty()) return;

        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        realtimePushService.sendToUser(user.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(user));
    }

    @Transactional(readOnly = true)
    public ExploreHubResponse buildExploreHub(User user) {
        List<ConversationItemResponse> messages = listConversations(user);
        List<NotificationResponse> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream().limit(50).map(n -> new NotificationResponse(n.getId(), n.getType().name(), n.getTitle(), n.getMessage(), n.isRead(), n.getCreatedAt()))
                .toList();
        List<ActivityResponse> activities = activityRepository.findByUserOrderByCreatedAtDesc(user)
                .stream().limit(50).map(a -> new ActivityResponse(a.getId(), a.getType().name(), a.getSummary(),
                        a.getActor() != null ? a.getActor().getId() : null,
                        a.getActor() != null ? a.getActor().getFirstName() : null,
                        a.getActor() != null && !a.getActor().getPhotoUrls().isEmpty() ? a.getActor().getPhotoUrls().get(0) : null,
                        a.getCreatedAt(),
                        a.getScore(),
                        a.getReason(),
                        a.getReferenceId(),
                        parseExplainability(a.getExplainabilityJson())))
                .toList();
        long unreadMessages = messages.stream().mapToLong(ConversationItemResponse::unreadCount).sum();
        long unreadNotifications = notificationRepository.countByUserAndReadFalse(user);
        return new ExploreHubResponse(messages, notifications, activities, unreadMessages, unreadNotifications);
    }

    private List<ExplainabilityItemResponse> parseExplainability(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<ExplainabilityItemResponse>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Conversation getAuthorizedConversation(User user, UUID conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        boolean authorized;
        if (Boolean.TRUE.equals(conversation.getTeaserConversation())) {
            authorized = conversation.getTeaserOwnerUser() != null && conversation.getTeaserOwnerUser().getId().equals(user.getId());
        } else {
            MatchEntity match = conversation.getMatch();
            authorized = match != null && (match.getUserOne().getId().equals(user.getId()) || match.getUserTwo().getId().equals(user.getId()));
        }
        if (!authorized) throw new RuntimeException("Forbidden");
        if (!Boolean.TRUE.equals(conversation.getTeaserConversation()) && conversation.getMatch() != null) {
            User other = conversation.getMatch().getUserOne().getId().equals(user.getId()) ? conversation.getMatch().getUserTwo() : conversation.getMatch().getUserOne();
            if (safetyService.isBlockedEitherDirection(user, other)) {
                throw new RuntimeException("Bu konuşma erişime kapalı.");
            }
        }
        return conversation;
    }

    private void seedNpcTeaserConversationIfNeeded(User user) {
        if (Boolean.TRUE.equals(teaserSeedInProgress.get())) {
            return;
        }

        if (Boolean.TRUE.equals(user.getNpc()) || !Boolean.TRUE.equals(user.getOnboardingCompleted())) {
            return;
        }

        teaserSeedInProgress.set(true);
        try {
            boolean exists = conversationRepository.findAll().stream().anyMatch(c ->
                    Boolean.TRUE.equals(c.getTeaserConversation())
                            && c.getTeaserOwnerUser() != null
                            && c.getTeaserOwnerUser().getId().equals(user.getId()));
            if (exists) {
                return;
            }

            User npc = userRepository.findByNpcTrue().stream().findFirst().orElse(null);
            if (npc == null) {
                return;
            }

            Conversation conversation = new Conversation();
            conversation.setTeaserConversation(true);
            conversation.setTeaserProfileLocked(true);
            conversation.setTeaserCtaText("Profili görmek için premium al");
            conversation.setTeaserOwnerUser(user);
            conversation.setTeaserNpcUser(npc);
            conversation.setUpdatedAt(LocalDateTime.now());
            conversation = conversationRepository.save(conversation);

            MessageEntity first = new MessageEntity();
            first.setConversation(conversation);
            first.setSender(npc);
            first.setContent("Merhaba yenisin galiba… Ben Luna ✨ Profilimi görmek istersen premium ile kilidi açabilirsin.");
            messageRepository.save(first);

            createNotification(user, NotificationType.MESSAGE, "Luna'dan teaser mesaj", "Merhaba yenisin galiba… Profili görmek için premium al.");
            createActivity(user, npc, ActivityType.MESSAGE_RECEIVED, "Luna sana teaser bir mesaj gönderdi.");
            // Avoid recursive explore-hub rebuild while listConversations/buildExploreHub is in progress.
        } finally {
            teaserSeedInProgress.remove();
        }
    }

    private MessageResponse toMessageResponse(MessageEntity message) {
        return new MessageResponse(message.getId(), message.getConversation().getId(), message.getSender().getId(),
                message.getSender().getEmail(), message.getContent(), message.getClientMessageId(), message.getCreatedAt(), message.getDeliveredAt(), message.getReadAt());
    }

    private void createNotification(User user, NotificationType type, String title, String message) {
        NotificationEntity n = new NotificationEntity();
        n.setUser(user);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        notificationRepository.save(n);
    }

    private void createActivity(User user, User actor, ActivityType type, String summary) {
        ActivityEntity a = new ActivityEntity();
        a.setUser(user);
        a.setActor(actor);
        a.setType(type);
        a.setSummary(summary);
        activityRepository.save(a);
    }
}
