package org.api.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Request DTO for updating user's live location
 */
public record LiveLocationUpdateRequest(
    /**
     * Latitude in decimal degrees (WGS84)
     * Range: -90 to 90
     */
    Double latitude,
    
    /**
     * Longitude in decimal degrees (WGS84)
     * Range: -180 to 180
     */
    Double longitude,
    
    /**
     * Accuracy of the location fix in meters
     */
    Float accuracyMeters,
    
    /**
     * Altitude in meters above WGS84 ellipsoid
     */
    Double altitudeMeters,
    
    /**
     * Speed in meters per second
     */
    Float speedMps,
    
    /**
     * Heading/bearing in degrees (0-360)
     */
    Float headingDegrees,
    
    /**
     * When this location was recorded by the device
     * If null, server will use current timestamp
     */
    LocalDateTime recordedAt,
    
    /**
     * Session identifier for continuous tracking
     * If null, a new session will be created
     */
    UUID sessionId,
    
    /**
     * Battery level percentage (0-100)
     * Optional, used for optimizing update frequency
     */
    Integer batteryLevel,
    
    /**
     * Whether location was obtained while app was in foreground
     */
    Boolean isForeground
) {
    public LiveLocationUpdateRequest {
        // Validate latitude range
        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }
        
        // Validate longitude range
        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }
        
        // Validate accuracy
        if (accuracyMeters != null && accuracyMeters < 0) {
            throw new IllegalArgumentException("Accuracy cannot be negative");
        }
        
        // Validate battery level
        if (batteryLevel != null && (batteryLevel < 0 || batteryLevel > 100)) {
            throw new IllegalArgumentException("Battery level must be between 0 and 100");
        }
        
        // Validate heading
        if (headingDegrees != null && (headingDegrees < 0 || headingDegrees > 360)) {
            throw new IllegalArgumentException("Heading must be between 0 and 360");
        }
    }
}
