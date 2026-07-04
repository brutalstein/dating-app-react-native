package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.entity.User;
import org.api.backend.repos.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PresenceService {
    private final UserRepository userRepository;
    private final Set<String> onlineUsers = ConcurrentHashMap.newKeySet();
    private final Map<String, LocalDateTime> lastOnlineTime = new ConcurrentHashMap<>();
    private final Map<String, Integer> sessionCount = new ConcurrentHashMap<>();

    public void markOnline(String email) {
        onlineUsers.add(email);
        lastOnlineTime.put(email, LocalDateTime.now());
        sessionCount.merge(email, 1, Integer::sum);
        log.debug("event=user_marked_online email={} sessions={}", email, sessionCount.get(email));
    }

    public void markOffline(String email) {
        int count = sessionCount.getOrDefault(email, 0);
        if (count <= 1) {
            onlineUsers.remove(email);
            sessionCount.remove(email);
            userRepository.findByEmail(email).ifPresent(user -> {
                user.setLastSeen(LocalDateTime.now());
                userRepository.save(user);
            });
            log.debug("event=user_marked_offline email=all_sessions_closed");
        } else {
            sessionCount.put(email, count - 1);
            log.debug("event=session_decremented email={} remainingSessions={}", email, count - 1);
        }
    }

    public boolean isOnline(User user) {
        return user != null && user.getEmail() != null && onlineUsers.contains(user.getEmail());
    }
    
    public int getSessionCount(String email) {
        return sessionCount.getOrDefault(email, 0);
    }
    
    public LocalDateTime getLastOnlineTime(String email) {
        return lastOnlineTime.get(email);
    }
}
