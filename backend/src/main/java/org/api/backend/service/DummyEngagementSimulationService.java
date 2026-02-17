package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import org.api.backend.entity.User;
import org.api.backend.repos.LikeRepository;
import org.api.backend.repos.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class DummyEngagementSimulationService {
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final SocialService socialService;

    private static final long MIN_COOLDOWN_MINUTES = 20;
    private static final long MAX_COOLDOWN_MINUTES = 90;

    private final Map<UUID, LocalDateTime> nextEligibleAtByUser = new ConcurrentHashMap<>();

    @Scheduled(fixedDelayString = "${bloom.simulation.dummy.fixed-delay-ms:45000}")
    @Transactional
    public void simulateNpcEngagement() {
        List<User> targets = userRepository.findByNpcFalseAndOnboardingCompletedTrueAndVerifiedTrue();
        if (targets.isEmpty()) {
            return;
        }

        List<User> npcs = userRepository.findByNpcTrue();
        if (npcs.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        ThreadLocalRandom random = ThreadLocalRandom.current();

        for (User target : targets) {
            if (target.getId() == null) {
                continue;
            }

            LocalDateTime nextEligibleAt = nextEligibleAtByUser.get(target.getId());
            if (nextEligibleAt != null && now.isBefore(nextEligibleAt)) {
                continue;
            }

            // Prevent noisy behavior: not every tick should generate an event.
            if (random.nextDouble() > 0.35d) {
                scheduleNext(target.getId(), now, random);
                continue;
            }

            User actor = npcs.get(random.nextInt(npcs.size()));
            if (actor.getId() == null || actor.getId().equals(target.getId())) {
                scheduleNext(target.getId(), now, random);
                continue;
            }

            // If already liked, skip this cycle to avoid duplicate notifications.
            if (likeRepository.existsBySenderAndReceiver(actor, target)) {
                scheduleNext(target.getId(), now, random);
                continue;
            }

            socialService.sendLike(actor, target.getId());
            scheduleNext(target.getId(), now, random);
        }
    }

    private void scheduleNext(UUID userId, LocalDateTime now, ThreadLocalRandom random) {
        long offset = random.nextLong(MIN_COOLDOWN_MINUTES, MAX_COOLDOWN_MINUTES + 1);
        nextEligibleAtByUser.put(userId, now.plusMinutes(offset));
    }
}
