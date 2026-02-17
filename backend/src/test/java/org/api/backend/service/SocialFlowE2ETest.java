package org.api.backend.service;

import org.api.backend.dto.LikeResponse;
import org.api.backend.dto.MessageResponse;
import org.api.backend.entity.Role;
import org.api.backend.entity.User;
import org.api.backend.repos.ConversationRepository;
import org.api.backend.repos.MessageRepository;
import org.api.backend.repos.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class SocialFlowE2ETest {

    @Autowired
    private SocialService socialService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ConversationRepository conversationRepository;
    @Autowired
    private MessageRepository messageRepository;

    @Test
    void likeMatchMessageRead_flowWorks() {
        User userA = createUser("usera@dpu.edu.tr", "Alice");
        User userB = createUser("userb@dpu.edu.tr", "Bob");

        LikeResponse firstLike = socialService.sendLike(userA, userB.getId());
        assertFalse(firstLike.matched());

        LikeResponse secondLike = socialService.sendLike(userB, userA.getId());
        assertTrue(secondLike.matched());
        assertNotNull(secondLike.conversationId());

        MessageResponse sent = socialService.sendMessage(userA, secondLike.conversationId(), "selam", "cid-1");
        assertEquals("selam", sent.content());

        socialService.markConversationRead(userB, secondLike.conversationId());

        var unreadAfterRead = messageRepository.findByConversationAndSenderNotAndReadAtIsNull(
                conversationRepository.findById(secondLike.conversationId()).orElseThrow(),
                userB
        );
        assertTrue(unreadAfterRead.isEmpty());
    }

    private User createUser(String email, String name) {
        User u = new User();
        u.setEmail(email);
        u.setPassword("$2a$10$7EqJtq98hPqEX7fNZaFWoOHi7Rj3v6zzWQ0imeISFRCGDpa2BkLom");
        u.setFirstName(name);
        u.setVerified(true);
        u.setOnboardingCompleted(true);
        u.setRole(Role.USER);
        return userRepository.save(u);
    }
}
