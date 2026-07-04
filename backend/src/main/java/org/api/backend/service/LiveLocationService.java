package org.api.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.dto.*;
import org.api.backend.entity.DevicePlatform;
import org.api.backend.entity.LiveLocation;
import org.api.backend.entity.User;
import org.api.backend.repos.LiveLocationRepository;
import org.api.backend.repos.MatchRepository;
import org.api.backend.repos.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing real-time live location sharing between matched users.
 * 
 * Key Features:
 * - Privacy-first: Only matched users can see each other's locations
 * - Time-limited sharing with automatic expiration
 * - Battery-efficient update strategies
 * - iOS and Android platform support
 * - Automatic cleanup of stale locations
 * 
 * Security Considerations:
 * - Location data is only shared with mutual matches
 * - Users can disable sharing at any time
 * - Location history is automatically purged
 * - Rate limiting on location updates to prevent tracking abuse
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LiveLocationService {
    
    private final LiveLocationRepository liveLocationRepository;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final RealtimePushService realtimePushService;
    private final PresenceService presenceService;
    
    @Value("${bloom.location.default-ttl-minutes:60}")
    private int defaultTtlMinutes;
    
    @Value("${bloom.location.max-ttl-minutes:480}")
    private int maxTtlMinutes;
    
    @Value("${bloom.location.update-interval-seconds:30}")
    private int minUpdateIntervalSeconds;
    
    @Value("${bloom.location.enabled:true}")
    private boolean locationFeatureEnabled;
    
    /**
     * Enable or disable live location sharing for a user
     */
    @Transactional
    public LiveLocationSharingToggleResponse toggleLocationSharing(
            User user, 
            LiveLocationSharingToggleRequest request) {
        
        if (!locationFeatureEnabled) {
            throw new IllegalStateException("Live location feature is currently disabled");
        }
        
        if (Boolean.TRUE.equals(request.enabled())) {
            int durationMinutes = request.durationMinutes() != null 
                ? request.durationMinutes() 
                : defaultTtlMinutes;
            
            if (durationMinutes > maxTtlMinutes) {
                durationMinutes = maxTtlMinutes;
            }
            
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(durationMinutes);
            
            log.info("event=location_sharing_enabled userId={} durationMinutes={} expiresAt={}", 
                user.getId(), durationMinutes, expiresAt);
            
            return new LiveLocationSharingToggleResponse(true, expiresAt, 
                "Konum paylaşımı " + durationMinutes + " dakika süreyle etkinleştirildi.");
        } else {
            int deactivatedCount = liveLocationRepository.deactivateAllForUser(user.getId());
            
            log.info("event=location_sharing_disabled userId={} deactivatedLocations={}", 
                user.getId(), deactivatedCount);
            
            // Notify matched users that location is no longer being shared
            notifyMatchesAboutLocationChange(user, false);
            
            return new LiveLocationSharingToggleResponse(false, null, 
                "Konum paylaşımı devre dışı bırakıldı.");
        }
    }
    
    /**
     * Update user's current location
     */
    @Transactional
    public LiveLocationResponse updateLocation(
            User user, 
            LiveLocationUpdateRequest request,
            DevicePlatform platform) {
        
        if (!locationFeatureEnabled) {
            throw new IllegalStateException("Live location feature is currently disabled");
        }
        
        // Validate coordinates
        if (request.latitude() == null || request.longitude() == null) {
            throw new IllegalArgumentException("Latitude and longitude are required");
        }
        
        // Check if user has active location sharing enabled
        Optional<LiveLocation> existingOpt = liveLocationRepository.findTopByUserIdAndIsActiveTrueOrderByRecordedAtDesc(user.getId());
        
        if (existingOpt.isEmpty()) {
            throw new IllegalStateException("Live location sharing is not enabled. Please enable it first.");
        }
        
        LiveLocation existing = existingOpt.get();
        
        // Rate limiting: prevent too frequent updates
        LocalDateTime now = LocalDateTime.now();
        if (existing.getRecordedAt() != null) {
            long secondsSinceLastUpdate = java.time.Duration.between(existing.getRecordedAt(), now).getSeconds();
            if (secondsSinceLastUpdate < minUpdateIntervalSeconds) {
                log.debug("event=location_update_rate_limited userId={} secondsSinceLastUpdate={}", 
                    user.getId(), secondsSinceLastUpdate);
                // Return existing location instead of throwing error
                return buildLocationResponse(user, existing, null);
            }
        }
        
        // Determine session ID
        UUID sessionId = request.sessionId() != null 
            ? request.sessionId() 
            : (existing.getSessionId() != null ? existing.getSessionId() : UUID.randomUUID());
        
        // Create new location record
        LiveLocation location = new LiveLocation();
        location.setUser(user);
        location.setLatitude(request.latitude());
        location.setLongitude(request.longitude());
        location.setAccuracyMeters(request.accuracyMeters());
        location.setAltitudeMeters(request.altitudeMeters());
        location.setSpeedMps(request.speedMps());
        location.setHeadingDegrees(request.headingDegrees());
        location.setRecordedAt(request.recordedAt() != null ? request.recordedAt() : now);
        location.setExpiresAt(existing.getExpiresAt()); // Inherit expiration from sharing session
        location.setIsActive(true);
        location.setSessionId(sessionId);
        location.setPlatform(platform);
        location.setBatteryLevel(request.batteryLevel());
        location.setIsForeground(request.isForeground() != null ? request.isForeground() : true);
        
        liveLocationRepository.save(location);
        
        log.debug("event=location_updated userId={} lat={} lon={} accuracy={}m", 
            user.getId(), request.latitude(), request.longitude(), 
            request.accuracyMeters() != null ? request.accuracyMeters() : "N/A");
        
        // Push update to matched users in real-time
        pushLocationUpdateToMatches(user, location);
        
        return buildLocationResponse(user, location, null);
    }
    
    /**
     * Get live locations of all matched users who are currently sharing
     */
    @Transactional(readOnly = true)
    public LiveLocationsListResponse getMatchedUsersLocations(User currentUser) {
        if (!locationFeatureEnabled) {
            return new LiveLocationsListResponse(Collections.emptyList(), 0, LocalDateTime.now());
        }
        
        // Get all matched user IDs
        List<UUID> matchedUserIds = matchRepository.findAllByUserOneIdOrUserTwoId(currentUser.getId(), currentUser.getId())
            .stream()
            .map(match -> {
                if (match.getUserOne().getId().equals(currentUser.getId())) {
                    return match.getUserTwo().getId();
                } else {
                    return match.getUserOne().getId();
                }
            })
            .collect(Collectors.toList());
        
        if (matchedUserIds.isEmpty()) {
            return new LiveLocationsListResponse(Collections.emptyList(), 0, LocalDateTime.now());
        }
        
        // Get active locations for matched users
        LocalDateTime now = LocalDateTime.now();
        List<LiveLocation> locations = liveLocationRepository.findActiveLocationsByUserIds(matchedUserIds, now);
        
        List<LiveLocationResponse> responses = new ArrayList<>();
        for (LiveLocation loc : locations) {
            User locationUser = loc.getUser();
            
            // Skip if blocked either direction
            // (SafetyService would need to be injected if we want full blocking support)
            
            Double distanceKm = currentUser.getLatitude() != null && currentUser.getLongitude() != null
                ? loc.distanceTo(currentUser.getLatitude(), currentUser.getLongitude())
                : null;
            
            responses.add(buildLocationResponse(locationUser, loc, distanceKm));
        }
        
        // Sort by distance (closest first) if distance is available
        responses.sort(Comparator.comparing(LiveLocationResponse::distanceKm, 
            Comparator.nullsLast(Comparator.naturalOrder())));
        
        return new LiveLocationsListResponse(responses, responses.size(), now);
    }
    
    /**
     * Get a specific user's live location (only if they're a match and sharing)
     */
    @Transactional(readOnly = true)
    public Optional<LiveLocationResponse> getUserLocation(User currentUser, UUID targetUserId) {
        if (!locationFeatureEnabled) {
            return Optional.empty();
        }
        
        // Verify users are matched
        boolean isMatched = matchRepository.findAllByUserOneIdOrUserTwoId(currentUser.getId(), targetUserId)
            .stream()
            .anyMatch(match -> 
                (match.getUserOne().getId().equals(currentUser.getId()) && match.getUserTwo().getId().equals(targetUserId)) ||
                (match.getUserTwo().getId().equals(currentUser.getId()) && match.getUserOne().getId().equals(targetUserId))
            );
        
        if (!isMatched) {
            log.warn("event=location_access_denied requester={} target={} reason=not_matched", 
                currentUser.getId(), targetUserId);
            return Optional.empty();
        }
        
        Optional<LiveLocation> locationOpt = liveLocationRepository.findTopByUserIdAndIsActiveTrueOrderByRecordedAtDesc(targetUserId);
        
        if (locationOpt.isEmpty() || locationOpt.get().isExpired()) {
            return Optional.empty();
        }
        
        LiveLocation location = locationOpt.get();
        Double distanceKm = currentUser.getLatitude() != null && currentUser.getLongitude() != null
            ? location.distanceTo(currentUser.getLatitude(), currentUser.getLongitude())
            : null;
        
        return Optional.of(buildLocationResponse(userRepository.findById(targetUserId).orElseThrow(), location, distanceKm));
    }
    
    /**
     * Push location update to all matched users via WebSocket
     */
    private void pushLocationUpdateToMatches(User user, LiveLocation location) {
        List<UUID> matchedUserIds = matchRepository.findAllByUserOneIdOrUserTwoId(user.getId(), user.getId())
            .stream()
            .map(match -> {
                if (match.getUserOne().getId().equals(user.getId())) {
                    return match.getUserTwo().getId();
                } else {
                    return match.getUserOne().getId();
                }
            })
            .collect(Collectors.toList());
        
        for (UUID matchedUserId : matchedUserIds) {
            try {
                User matchedUser = userRepository.findById(matchedUserId).orElse(null);
                if (matchedUser != null) {
                    Double distanceKm = matchedUser.getLatitude() != null && matchedUser.getLongitude() != null
                        ? location.distanceTo(matchedUser.getLatitude(), matchedUser.getLongitude())
                        : null;
                    
                    LiveLocationResponse response = buildLocationResponse(user, location, distanceKm);
                    
                    realtimePushService.sendToUser(
                        matchedUser.getEmail(),
                        "LOCATION_UPDATE",
                        Map.of("type", "LOCATION_UPDATE", "payload", response)
                    );
                }
            } catch (Exception e) {
                log.error("event=location_push_failed userId={} matchedUserId={} error={}", 
                    user.getId(), matchedUserId, e.getMessage());
            }
        }
    }
    
    /**
     * Notify matched users when location sharing is enabled/disabled
     */
    private void notifyMatchesAboutLocationChange(User user, boolean isSharing) {
        List<UUID> matchedUserIds = matchRepository.findAllByUserOneIdOrUserTwoId(user.getId(), user.getId())
            .stream()
            .map(match -> {
                if (match.getUserOne().getId().equals(user.getId())) {
                    return match.getUserTwo().getId();
                } else {
                    return match.getUserOne().getId();
                }
            })
            .collect(Collectors.toList());
        
        for (UUID matchedUserId : matchedUserIds) {
            try {
                User matchedUser = userRepository.findById(matchedUserId).orElse(null);
                if (matchedUser != null) {
                    realtimePushService.sendToUser(
                        matchedUser.getEmail(),
                        "LOCATION_SHARING_STATUS",
                        Map.of(
                            "type", "LOCATION_SHARING_STATUS",
                            "userId", user.getId(),
                            "isSharing", isSharing
                        )
                    );
                }
            } catch (Exception e) {
                log.error("event=location_status_notify_failed userId={} matchedUserId={} error={}", 
                    user.getId(), matchedUserId, e.getMessage());
            }
        }
    }
    
    /**
     * Build response DTO from entity
     */
    private LiveLocationResponse buildLocationResponse(User user, LiveLocation location, Double distanceKm) {
        return new LiveLocationResponse(
            user.getId(),
            user.getFirstName(),
            user.getPhotoUrls() != null && !user.getPhotoUrls().isEmpty() 
                ? user.getPhotoUrls().get(0) 
                : null,
            location.getLatitude(),
            location.getLongitude(),
            location.getAccuracyMeters(),
            location.getRecordedAt(),
            location.getExpiresAt(),
            location.getIsActive(),
            location.getSessionId(),
            distanceKm,
            location.getSpeedMps(),
            location.getHeadingDegrees(),
            presenceService.isOnline(user),
            user.getLastSeen()
        );
    }
    
    /**
     * Scheduled task: Clean up expired locations every 5 minutes
     */
    @Scheduled(fixedRateString = "${bloom.location.cleanup-interval-ms:300000}")
    @Transactional
    public void cleanupExpiredLocations() {
        if (!locationFeatureEnabled) {
            return;
        }
        
        LocalDateTime now = LocalDateTime.now();
        
        // Deactivate expired locations
        int deactivatedCount = liveLocationRepository.deactivateExpiredLocations(now);
        
        if (deactivatedCount > 0) {
            log.info("event=expired_locations_deactivated count={}", deactivatedCount);
        }
        
        // Delete old inactive locations (older than 7 days)
        LocalDateTime cutoffDate = now.minusDays(7);
        int deletedCount = liveLocationRepository.deleteOldInactiveLocations(cutoffDate);
        
        if (deletedCount > 0) {
            log.info("event=old_locations_deleted count={}", deletedCount);
        }
    }
    
    /**
     * Get user's current location sharing status
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getLocationSharingStatus(User user) {
        Optional<LiveLocation> activeLocation = liveLocationRepository.findTopByUserIdAndIsActiveTrueOrderByRecordedAtDesc(user.getId());
        
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", activeLocation.isPresent() && !activeLocation.get().isExpired());
        status.put("expiresAt", activeLocation.map(LiveLocation::getExpiresAt).orElse(null));
        status.put("lastUpdatedAt", activeLocation.map(LiveLocation::getRecordedAt).orElse(null));
        status.put("featureEnabled", locationFeatureEnabled);
        
        return status;
    }
}
