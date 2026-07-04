package org.api.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.api.backend.dto.LiveLocationResponse;
import org.api.backend.dto.LiveLocationSharingToggleRequest;
import org.api.backend.dto.LiveLocationSharingToggleResponse;
import org.api.backend.dto.LiveLocationUpdateRequest;
import org.api.backend.dto.LiveLocationsListResponse;
import org.api.backend.entity.DevicePlatform;
import org.api.backend.entity.User;
import org.api.backend.service.LiveLocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REST Controller for live location sharing functionality.
 * 
 * Endpoints:
 * - POST /api/location/sharing/toggle - Enable/disable location sharing
 * - GET /api/location/sharing/status - Get current sharing status
 * - POST /api/location/update - Update current location
 * - GET /api/location/matches - Get locations of all matched users
 * - GET /api/location/user/{userId} - Get specific user's location (if matched)
 * 
 * Security:
 * - All endpoints require authentication
 * - Location data is only accessible to matched users
 * - Rate limiting applies to location updates
 */
@Slf4j
@RestController
@RequestMapping("/api/location")
@RequiredArgsConstructor
public class LiveLocationController {
    
    private final LiveLocationService liveLocationService;
    
    /**
     * Enable or disable live location sharing
     * 
     * @param user authenticated user
     * @param request toggle request with enabled flag and optional duration
     * @return response with new status and expiration time
     */
    @PostMapping("/sharing/toggle")
    public ResponseEntity<LiveLocationSharingToggleResponse> toggleLocationSharing(
            @AuthenticationPrincipal User user,
            @RequestBody LiveLocationSharingToggleRequest request) {
        
        log.info("event=location_sharing_toggle userId={} enabled={}", 
            user.getId(), request.enabled());
        
        LiveLocationSharingToggleResponse response = 
            liveLocationService.toggleLocationSharing(user, request);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get current location sharing status
     * 
     * @param user authenticated user
     * @return status map with enabled flag and expiration info
     */
    @GetMapping("/sharing/status")
    public ResponseEntity<Map<String, Object>> getLocationSharingStatus(
            @AuthenticationPrincipal User user) {
        
        Map<String, Object> status = liveLocationService.getLocationSharingStatus(user);
        
        return ResponseEntity.ok(status);
    }
    
    /**
     * Update user's current location
     * 
     * @param user authenticated user
     * @param request location update with coordinates and metadata
     * @param platformHeader platform identifier from request header
     * @return updated location response
     */
    @PostMapping("/update")
    public ResponseEntity<LiveLocationResponse> updateLocation(
            @AuthenticationPrincipal User user,
            @RequestBody LiveLocationUpdateRequest request,
            @RequestHeader(value = "X-Platform", defaultValue = "WEB") String platformHeader) {
        
        DevicePlatform platform;
        try {
            platform = DevicePlatform.valueOf(platformHeader.toUpperCase());
        } catch (IllegalArgumentException e) {
            platform = DevicePlatform.WEB;
        }
        
        log.debug("event=location_update userId={} lat={} lon={}", 
            user.getId(), request.latitude(), request.longitude());
        
        LiveLocationResponse response = 
            liveLocationService.updateLocation(user, request, platform);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get live locations of all matched users who are currently sharing
     * 
     * @param user authenticated user
     * @return list of location responses for matched users
     */
    @GetMapping("/matches")
    public ResponseEntity<LiveLocationsListResponse> getMatchedUsersLocations(
            @AuthenticationPrincipal User user) {
        
        LiveLocationsListResponse response = 
            liveLocationService.getMatchedUsersLocations(user);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get a specific matched user's live location
     * 
     * @param user authenticated user
     * @param targetUserId ID of the user whose location is requested
     * @return location response if user is matched and sharing, 404 otherwise
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<LiveLocationResponse> getUserLocation(
            @AuthenticationPrincipal User user,
            @PathVariable("userId") UUID targetUserId) {
        
        Optional<LiveLocationResponse> locationOpt = 
            liveLocationService.getUserLocation(user, targetUserId);
        
        return locationOpt
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
