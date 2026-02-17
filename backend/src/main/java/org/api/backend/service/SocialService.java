package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import org.api.backend.dto.*;
import org.api.backend.entity.*;
import org.api.backend.repos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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

    @Transactional
    public LikeResponse sendLike(User sender, UUID targetUserId) {
        User receiver = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        if (sender.getId().equals(receiver.getId())) {
            throw new RuntimeException("You cannot like yourself");
        }

        if (!likeRepository.existsBySenderAndReceiver(sender, receiver)) {
            LikeInteraction like = new LikeInteraction();
            like.setSender(sender);
            like.setReceiver(receiver);
            likeRepository.save(like);
        }

        createNotification(receiver, NotificationType.LIKE, "Yeni beğeni", sender.getFirstName() + " seni beğendi.");
        createActivity(receiver, sender, ActivityType.LIKE_RECEIVED, sender.getFirstName() + " profilini beğendi.");

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

        realtimePushService.sendToUser(sender.getEmail(), "MATCH_CREATED", buildExploreHub(sender));
        realtimePushService.sendToUser(receiver.getEmail(), "MATCH_CREATED", buildExploreHub(receiver));

        return new LikeResponse(true, match.getId(), conversation.getId(), "It's a match");
    }

    @Transactional(readOnly = true)
    public List<ConversationItemResponse> listConversations(User user) {
        return matchRepository.findByUserOneOrUserTwoOrderByCreatedAtDesc(user, user).stream().map(match -> {
            Conversation c = conversationRepository.findByMatch(match).orElse(null);
            if (c == null) return null;
            User other = match.getUserOne().getId().equals(user.getId()) ? match.getUserTwo() : match.getUserOne();
            MessageEntity last = messageRepository.findTopByConversationOrderByCreatedAtDesc(c);
            String lastMessage = last != null ? last.getContent() : "";
            LocalDateTime lastAt = last != null ? last.getCreatedAt() : c.getCreatedAt();
            long unread = messageRepository.countByConversationAndSenderNotAndReadAtIsNull(c, user);
            return new ConversationItemResponse(c.getId(), match.getId(), other.getId(), other.getFirstName(),
                    other.getPhotoUrls().isEmpty() ? null : other.getPhotoUrls().get(0), lastMessage, lastAt, unread);
        }).filter(java.util.Objects::nonNull).toList();
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
    public MessageResponse sendMessage(User user, UUID conversationId, String content) {
        if (content == null || content.trim().isBlank()) throw new RuntimeException("Message empty");

        Conversation conversation = getAuthorizedConversation(user, conversationId);
        MatchEntity match = conversation.getMatch();
        User recipient = match.getUserOne().getId().equals(user.getId()) ? match.getUserTwo() : match.getUserOne();

        MessageEntity message = new MessageEntity();
        message.setConversation(conversation);
        message.setSender(user);
        message.setContent(content.trim());
        message = messageRepository.save(message);

        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        createNotification(recipient, NotificationType.MESSAGE, "Yeni mesaj", user.getFirstName() + ": " + message.getContent());
        createActivity(recipient, user, ActivityType.MESSAGE_RECEIVED, user.getFirstName() + " sana mesaj gönderdi.");

        var response = toMessageResponse(message);
        realtimePushService.sendToUser(recipient.getEmail(), "MESSAGE_RECEIVED", response);
        realtimePushService.sendToUser(user.getEmail(), "MESSAGE_SENT", response);
        realtimePushService.sendToUser(recipient.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(recipient));
        realtimePushService.sendToUser(user.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(user));

        return response;
    }

    @Transactional
    public void markConversationRead(User user, UUID conversationId) {
        Conversation conversation = getAuthorizedConversation(user, conversationId);
        List<MessageEntity> unread = messageRepository.findByConversationAndSenderNotAndReadAtIsNull(conversation, user);
        LocalDateTime now = LocalDateTime.now();
        unread.forEach(m -> m.setReadAt(now));
        messageRepository.saveAll(unread);

        MatchEntity match = conversation.getMatch();
        User other = match.getUserOne().getId().equals(user.getId()) ? match.getUserTwo() : match.getUserOne();

        realtimePushService.sendToUser(other.getEmail(), "MESSAGES_READ", conversationId);
        realtimePushService.sendToUser(user.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(user));
        realtimePushService.sendToUser(other.getEmail(), "EXPLORE_HUB_UPDATED", buildExploreHub(other));
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
                        a.getCreatedAt()))
                .toList();
        long unreadMessages = messages.stream().mapToLong(ConversationItemResponse::unreadCount).sum();
        long unreadNotifications = notificationRepository.countByUserAndReadFalse(user);
        return new ExploreHubResponse(messages, notifications, activities, unreadMessages, unreadNotifications);
    }

    private Conversation getAuthorizedConversation(User user, UUID conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        MatchEntity match = conversation.getMatch();
        boolean authorized = match.getUserOne().getId().equals(user.getId()) || match.getUserTwo().getId().equals(user.getId());
        if (!authorized) throw new RuntimeException("Forbidden");
        return conversation;
    }

    private MessageResponse toMessageResponse(MessageEntity message) {
        return new MessageResponse(message.getId(), message.getConversation().getId(), message.getSender().getId(),
                message.getContent(), message.getCreatedAt(), message.getReadAt());
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
