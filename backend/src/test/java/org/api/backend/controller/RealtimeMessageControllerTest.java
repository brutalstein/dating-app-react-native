package org.api.backend.controller;

import org.api.backend.dto.ExploreHubResponse;
import org.api.backend.dto.MessageResponse;
import org.api.backend.dto.SendMessageRequest;
import org.api.backend.entity.User;
import org.api.backend.repos.UserRepository;
import org.api.backend.service.SocialService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.Principal;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RealtimeMessageControllerTest {

    @Mock
    private SocialService socialService;

    @Mock
    private UserRepository userRepository;

    private RealtimeMessageController controller;

    @BeforeEach
    void setUp() {
        controller = new RealtimeMessageController(socialService, userRepository);
    }

    @Test
    void send_returnsMessage_whenPrincipalUserExists() {
        Principal principal = () -> "alice@uni.edu.tr";
        User sender = new User();
        sender.setEmail("alice@uni.edu.tr");
        UUID conversationId = UUID.randomUUID();
        SendMessageRequest request = new SendMessageRequest(conversationId, "selam", "client-1");
        MessageResponse expected = new MessageResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "alice@uni.edu.tr",
                "selam",
                "client-1",
                null,
                null,
                null
        );

        when(userRepository.findByEmail("alice@uni.edu.tr")).thenReturn(Optional.of(sender));
        when(socialService.sendMessage(sender, conversationId, "selam", "client-1")).thenReturn(expected);

        MessageResponse actual = controller.send(request, principal);

        assertEquals(expected, actual);
        verify(socialService).sendMessage(sender, conversationId, "selam", "client-1");
    }

    @Test
    void send_throwsWhenPrincipalUserMissing() {
        Principal principal = () -> "missing@uni.edu.tr";
        SendMessageRequest request = new SendMessageRequest(UUID.randomUUID(), "selam", "client-1");
        when(userRepository.findByEmail("missing@uni.edu.tr")).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> controller.send(request, principal));
    }

    @Test
    void sync_returnsExploreHub_whenPrincipalUserExists() {
        Principal principal = () -> "alice@uni.edu.tr";
        User user = new User();
        user.setEmail("alice@uni.edu.tr");
        ExploreHubResponse expected = new ExploreHubResponse(java.util.List.of(), java.util.List.of(), java.util.List.of(), 0, 0);

        when(userRepository.findByEmail("alice@uni.edu.tr")).thenReturn(Optional.of(user));
        when(socialService.buildExploreHub(user)).thenReturn(expected);

        ExploreHubResponse actual = controller.sync(principal);

        assertEquals(expected, actual);
        verify(socialService).buildExploreHub(user);
    }
}
