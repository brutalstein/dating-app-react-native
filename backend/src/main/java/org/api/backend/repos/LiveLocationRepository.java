package org.api.backend.repos;

import org.api.backend.entity.LiveLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LiveLocation entity with optimized queries for real-time location tracking
 */
@Repository
public interface LiveLocationRepository extends JpaRepository<LiveLocation, UUID> {
    
    /**
     * Find the most recent active location for a user
     */
    Optional<LiveLocation> findTopByUserIdAndIsActiveTrueOrderByRecordedAtDesc(UUID userId);
    
    /**
     * Find all active locations for a list of user IDs (for matched users)
     */
    @Query("SELECT ll FROM LiveLocation ll WHERE ll.user.id IN :userIds AND ll.isActive = true AND ll.expiresAt > :now ORDER BY ll.recordedAt DESC")
    List<LiveLocation> findActiveLocationsByUserIds(@Param("userIds") List<UUID> userIds, @Param("now") LocalDateTime now);
    
    /**
     * Find active location for a specific user within a session
     */
    Optional<LiveLocation> findTopByUserIdAndSessionIdAndIsActiveTrueOrderByRecordedAtDesc(
        UUID userId, UUID sessionId);
    
    /**
     * Find all active locations that have expired (for cleanup)
     */
    @Query("SELECT ll FROM LiveLocation ll WHERE ll.expiresAt < :now AND ll.isActive = true")
    List<LiveLocation> findExpiredActiveLocations(@Param("now") LocalDateTime now);
    
    /**
     * Count active locations for a user
     */
    long countByUserIdAndIsActiveTrue(UUID userId);
    
    /**
     * Deactivate all locations for a user (when they disable sharing)
     */
    @Modifying
    @Query("UPDATE LiveLocation ll SET ll.isActive = false WHERE ll.user.id = :userId AND ll.isActive = true")
    int deactivateAllForUser(@Param("userId") UUID userId);
    
    /**
     * Bulk deactivate expired locations
     */
    @Modifying
    @Query("UPDATE LiveLocation ll SET ll.isActive = false WHERE ll.expiresAt < :now AND ll.isActive = true")
    int deactivateExpiredLocations(@Param("now") LocalDateTime now);
    
    /**
     * Delete old inactive locations (older than specified date)
     */
    @Modifying
    @Query("DELETE FROM LiveLocation ll WHERE ll.isActive = false AND ll.createdAt < :cutoffDate")
    int deleteOldInactiveLocations(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    /**
     * Find locations within a geographic bounding box (for nearby users feature)
     * Note: This is a simple bounding box query. For production, consider PostGIS extension.
     */
    @Query("SELECT ll FROM LiveLocation ll WHERE ll.isActive = true " +
           "AND ll.latitude BETWEEN :minLat AND :maxLat " +
           "AND ll.longitude BETWEEN :minLon AND :maxLon " +
           "AND ll.expiresAt > :now")
    List<LiveLocation> findLocationsInBoundingBox(
        @Param("minLat") Double minLat,
        @Param("maxLat") Double maxLat,
        @Param("minLon") Double minLon,
        @Param("maxLon") Double maxLon,
        @Param("now") LocalDateTime now);
}
