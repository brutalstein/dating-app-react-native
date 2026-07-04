package org.api.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Live location tracking entity for real-time user location sharing.
 * Supports iOS and Android location permission models.
 * 
 * Privacy & Security Features:
 * - User must explicitly enable live location sharing
 * - Location updates expire after configurable TTL (default: 1 hour)
 * - Only visible to matched users who have mutual consent
 * - Automatic cleanup of stale locations via scheduled task
 */
@Entity
@Getter
@Setter
@Table(name = "live_locations", indexes = {
    @Index(name = "idx_live_location_user", columnNames = "user_id"),
    @Index(name = "idx_live_location_expires", columnNames = "expires_at")
})
public class LiveLocation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    /**
     * User whose location is being tracked
     */
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    /**
     * Latitude in decimal degrees (WGS84)
     * Range: -90 to 90
     */
    @Column(nullable = false, precision = 10, scale = 8)
    private Double latitude;
    
    /**
     * Longitude in decimal degrees (WGS84)
     * Range: -180 to 180
     */
    @Column(nullable = false, precision = 11, scale = 8)
    private Double longitude;
    
    /**
     * Accuracy of the location fix in meters
     */
    @Column(name = "accuracy_meters")
    private Float accuracyMeters;
    
    /**
     * Altitude in meters above WGS84 ellipsoid
     */
    @Column(name = "altitude_meters", precision = 10, scale = 2)
    private Double altitudeMeters;
    
    /**
     * Speed in meters per second
     */
    @Column(name = "speed_mps", precision = 6, scale = 2)
    private Float speedMps;
    
    /**
     * Heading/bearing in degrees (0-360)
     */
    @Column(name = "heading_degrees")
    private Float headingDegrees;
    
    /**
     * When this location was recorded by the device
     */
    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;
    
    /**
     * When this location record expires and should be hidden
     * Default: 1 hour from last update
     */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    
    /**
     * Whether this is an active/live location share
     * Set to false when user disables sharing or session expires
     */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    /**
     * Session identifier for continuous tracking sessions
     * Allows grouping multiple location updates into a single session
     */
    @Column(name = "session_id")
    private UUID sessionId;
    
    /**
     * Platform that submitted this location (iOS/Android/Web)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "platform")
    private DevicePlatform platform;
    
    /**
     * Battery level percentage when location was recorded (optional)
     * Useful for optimizing update frequency based on battery status
     */
    @Column(name = "battery_level")
    private Integer batteryLevel;
    
    /**
     * Whether location was obtained while app was in foreground
     */
    @Column(name = "is_foreground", nullable = false)
    private Boolean isForeground = true;
    
    /**
     * Create timestamp
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    /**
     * Last update timestamp
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Check if this location has expired
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
    
    /**
     * Calculate distance to another location using Haversine formula
     * @param otherLat latitude of other point
     * @param otherLon longitude of other point
     * @return distance in kilometers
     */
    public double distanceTo(Double otherLat, Double otherLon) {
        if (this.latitude == null || this.longitude == null || 
            otherLat == null || otherLon == null) {
            return Double.MAX_VALUE;
        }
        
        final int R = 6371; // Earth's radius in km
        
        double lat1Rad = Math.toRadians(this.latitude);
        double lat2Rad = Math.toRadians(otherLat);
        double deltaLat = Math.toRadians(otherLat - this.latitude);
        double deltaLon = Math.toRadians(otherLon - this.longitude);
        
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                   Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                   Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
}
