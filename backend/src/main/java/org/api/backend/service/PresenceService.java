package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import org.api.backend.entity.User;
import org.api.backend.repos.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceService {
    private final UserRepository userRepository;
    private final Set<String> onlineUsers = ConcurrentHashMap.newKeySet();

    public void markOnline(String email) {
        onlineUsers.add(email);
    }

    public void markOffline(String email) {
        onlineUsers.remove(email);
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    public boolean isOnline(User user) {
        return user != null && user.getEmail() != null && onlineUsers.contains(user.getEmail());
    }
}
