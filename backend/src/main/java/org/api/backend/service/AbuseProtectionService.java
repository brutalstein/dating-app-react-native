package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.config.RateLimitProperties;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AbuseProtectionService {

    private final RateLimitProperties properties;

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();
    private final Map<String, FailureState> authFailures = new ConcurrentHashMap<>();

    public void enforceHttpRateLimit(String scope, String key) {
        int limit;
        int windowSeconds;
        if ("AUTH".equals(scope)) {
            limit = properties.getAuthLimit();
            windowSeconds = properties.getAuthWindowSeconds();
        } else if ("CRITICAL".equals(scope)) {
            limit = properties.getCriticalLimit();
            windowSeconds = properties.getCriticalWindowSeconds();
        } else if ("EXPLORE_HUB".equals(scope)) {
            limit = properties.getExploreHubLimit();
            windowSeconds = properties.getExploreHubWindowSeconds();
        } else {
            limit = properties.getDefaultLimit();
            windowSeconds = properties.getDefaultWindowSeconds();
        }

        enforce("http:" + scope + ":" + key, limit, windowSeconds,
                "Rate limit exceeded. Please try again later.");
    }

    public void enforceMessageFloodLimit(String actorKey) {
        enforce("msg-flood:" + actorKey,
                properties.getMessageFloodLimit(),
                properties.getMessageFloodWindowSeconds(),
                "Too many messages in a short time. Please slow down.");
    }

    public void checkAuthBackoff(String ip, String identifier) {
        String key = "auth-backoff:" + ip + ":" + safeIdentifier(identifier);
        FailureState state = authFailures.get(key);
        if (state == null) {
            return;
        }

        long now = Instant.now().getEpochSecond();
        if (state.blockUntilEpochSeconds > now) {
            throw new TooManyRequestsException(
                    "Too many failed authentication attempts. Please try again later.",
                    state.blockUntilEpochSeconds - now
            );
        }
    }

    public void registerAuthFailure(String ip, String identifier) {
        String key = "auth-backoff:" + ip + ":" + safeIdentifier(identifier);
        FailureState state = authFailures.computeIfAbsent(key, k -> new FailureState());
        synchronized (state) {
            state.failureCount += 1;
            int threshold = Math.max(1, properties.getAuthFailureThreshold());
            if (state.failureCount < threshold) {
                return;
            }

            int exponent = state.failureCount - threshold;
            long blockSeconds = (long) properties.getAuthFailureBaseBlockSeconds() * (1L << Math.min(exponent, 10));
            blockSeconds = Math.min(blockSeconds, properties.getAuthFailureMaxBlockSeconds());
            state.blockUntilEpochSeconds = Instant.now().getEpochSecond() + blockSeconds;
            log.warn("event=auth_fail_spike_detected ip={} identifier={} failureCount={} blockSeconds={}", ip, safeIdentifier(identifier), state.failureCount, blockSeconds);
        }
    }

    public void clearAuthFailures(String ip, String identifier) {
        String key = "auth-backoff:" + ip + ":" + safeIdentifier(identifier);
        authFailures.remove(key);
    }

    private void enforce(String key, int limit, int windowSeconds, String message) {
        WindowCounter counter = counters.computeIfAbsent(key, k -> new WindowCounter());
        long now = Instant.now().getEpochSecond();
        long threshold = now - windowSeconds;

        synchronized (counter) {
            while (!counter.timestamps.isEmpty() && counter.timestamps.peekFirst() <= threshold) {
                counter.timestamps.pollFirst();
            }

            if (counter.timestamps.size() >= limit) {
                long retryAfter = (counter.timestamps.peekFirst() + windowSeconds) - now;
                throw new TooManyRequestsException(message, Math.max(retryAfter, 1));
            }

            counter.timestamps.addLast(now);
        }
    }

    private String safeIdentifier(String value) {
        if (value == null || value.isBlank()) {
            return "anonymous";
        }
        return value.trim().toLowerCase();
    }

    private static class WindowCounter {
        private final ArrayDeque<Long> timestamps = new ArrayDeque<>();
    }

    private static class FailureState {
        private int failureCount = 0;
        private long blockUntilEpochSeconds = 0;
    }
}
