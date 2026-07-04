package org.api.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO containing live location data for a user
 */
public record LiveLocationResponse(
    /**
     * User ID whose location is being shared
     */
    UUID userId,
    
    /**
     * User's first name for display purposes
     */
    String firstName,
    
    /**
     * User's profile photo URL (if available)
     */
    String photoUrl,
    
    /**
     * Current latitude
     */
    Double latitude,
    
    /**
     * Current longitude
     */
    Double longitude,
    
    /**
     * Location accuracy in meters
     */
    Float accuracyMeters,
    
    /**
     * When this location was recorded
     */
    LocalDateTime recordedAt,
    
    /**
     * When this location expires
     */
    LocalDateTime expiresAt,
    
    /**
     * Whether the location is still active/valid
     */
    Boolean isActive,
    
    /**
     * Session ID for continuous tracking
     */
    UUID sessionId,
    
    /**
     * Distance from current user in kilometers (if applicable)
     */
    Double distanceKm,
    
    /**
     * Speed in meters per second (if available)
     */
    Float speedMps,
    
    /**
     * Heading/bearing in degrees (if available)
     */
    Float headingDegrees,
    
    /**
     * Whether user is currently online (from presence service)
     */
    Boolean isOnline,
    
    /**
     * Last seen timestamp
     */
    LocalDateTime lastSeen
) {
    /**
     * Check if this location has expired
     */
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }
    
    /**
     * Get formatted distance string
     */
    public String getDistanceString() {
        if (distanceKm == null || distanceKm.isNaN()) {
            return null;
        }
        
        if (distanceKm < 1.0) {
            return String.format("%.0f m", distanceKm * 1000);
        } else {
            return String.format("%.1f km", distanceKm);
        }
    }
}

/**
 * Response DTO for list of live locations from matched users
 */
record LiveLocationsListResponse(
    List<LiveLocationResponse> locations,
    Integer totalCount,
    LocalDateTime serverTime
) {}

/**
 * Request to enable/disable live location sharing
 */
record LiveLocationSharingToggleRequest(
    Boolean enabled,
    /**
     * Duration in minutes for how long to share location
     * Default: 60 minutes (1 hour)
     * Maximum: 480 minutes (8 hours)
     */
    Integer durationMinutes
) {
    public LiveLocationSharingToggleRequest {
        if (durationMinutes != null) {
            if (durationMinutes < 1 || durationMinutes > 480) {
                throw new IllegalArgumentException("Duration must be between 1 and 480 minutes");
            }
        }
    }
}

/**
 * Response for location sharing toggle operation
 */
record LiveLocationSharingToggleResponse(
    Boolean enabled,
    LocalDateTime expiresAt,
    String message
) {}
