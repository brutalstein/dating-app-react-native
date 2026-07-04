/**
 * LiveLocationMap Component
 * 
 * Interactive map showing live locations of matched users.
 * Features:
 * - Real-time location updates via WebSocket
 * - User-friendly markers with photos
 * - Distance calculations
 * - Privacy indicators
 * - Modern, clean UI
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { LiveLocationData } from '@/types/location';

interface LiveLocationMapProps {
  initialRegion?: Region;
  onLocationPress?: (location: LiveLocationData) => void;
}

export function LiveLocationMap({ initialRegion, onLocationPress }: LiveLocationMapProps) {
  const {
    isSharing,
    isLoading,
    error,
    currentLocation,
    matchedLocations,
    toggleSharing,
    fetchMatchedLocations,
    remainingMinutes,
  } = useLiveLocation();

  const [mapRegion, setMapRegion] = useState<Region>(
    initialRegion || {
      latitude: 41.0082, // Istanbul
      longitude: 28.9784,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }
  );

  /**
   * Handle marker press
   */
  const handleMarkerPress = useCallback((location: LiveLocationData) => {
    if (onLocationPress) {
      onLocationPress(location);
    } else {
      // Show default info
      Alert.alert(
        location.firstName,
        `${location.distanceKm?.toFixed(2) || '?'} km uzaklıkta`,
        [
          { text: 'Tamam', style: 'cancel' },
          { text: 'Mesaj Gönder', onPress: () => console.log('Navigate to chat') },
        ]
      );
    }
  }, [onLocationPress]);

  /**
   * Toggle location sharing
   */
  const handleToggleSharing = useCallback(async () => {
    try {
      if (isSharing) {
        Alert.alert(
          'Konum Paylaşımını Durdur',
          'Konum paylaşımını durdurmak istediğinize emin misiniz?',
          [
            { text: 'İptal', style: 'cancel' },
            { 
              text: 'Durdur', 
              style: 'destructive',
              onPress: () => toggleSharing()
            },
          ]
        );
      } else {
        await toggleSharing(60); // Default 60 minutes
      }
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'İşlem başarısız');
    }
  }, [isSharing, toggleSharing]);

  /**
   * Refresh matched locations
   */
  const handleRefresh = useCallback(async () => {
    try {
      await fetchMatchedLocations();
    } catch (err) {
      Alert.alert('Hata', 'Konumlar yüklenemedi');
    }
  }, [fetchMatchedLocations]);

  /**
   * Center map on current location
   */
  const centerOnCurrentUser = useCallback(() => {
    if (currentLocation) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, [currentLocation]);

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (minutes?: number): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}s ${mins}d` : `${hours}s`;
  };

  /**
   * Render custom marker
   */
  const renderMarker = (location: LiveLocationData, isCurrentUser = false) => {
    const isExpired = location.expiresAt && new Date(location.expiresAt) < new Date();
    
    return (
      <Marker
        key={`${location.userId}-${isCurrentUser ? 'current' : 'match'}`}
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        onPress={() => handleMarkerPress(location)}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={[
          styles.markerContainer,
          isCurrentUser && styles.currentUserMarker,
          isExpired && styles.expiredMarker,
        ]}>
          {location.photoUrl ? (
            <Image
              source={{ uri: location.photoUrl }}
              style={styles.markerAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.markerAvatarPlaceholder}>
              <Ionicons 
                name="person" 
                size={20} 
                color="#fff" 
              />
            </View>
          )}
          
          {/* Online indicator */}
          {location.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
          
          {/* Distance badge */}
          {location.distanceKm !== undefined && !isCurrentUser && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                {location.distanceKm.toFixed(1)} km
              </Text>
            </View>
          )}
          
          {/* Active sharing indicator */}
          {isCurrentUser && isSharing && (
            <View style={styles.sharingIndicator}>
              <View style={styles.sharingDot} />
              <Text style={styles.sharingText}>
                {formatTimeRemaining(remainingMinutes)}
              </Text>
            </View>
          )}
        </View>
      </Marker>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={!isSharing}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {/* Current user location */}
        {currentLocation && renderMarker(currentLocation, true)}
        
        {/* Matched users locations */}
        {matchedLocations.map(location => renderMarker(location))}
      </MapView>

      {/* Controls Overlay */}
      <View style={styles.controlsOverlay}>
        {/* Sharing Toggle Button */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            isSharing ? styles.sharingActiveButton : styles.sharingInactiveButton,
          ]}
          onPress={handleToggleSharing}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isSharing ? 'location' : 'location-outline'}
                size={24}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {isSharing ? 'Paylaşılıyor' : 'Konumu Paylaş'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Center on Current Location */}
        {currentLocation && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={centerOnCurrentUser}
          >
            <Ionicons name="navigate" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Panel */}
      {isSharing && (
        <View style={styles.infoPanel}>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color="#3B82F6" />
            <Text style={styles.infoText}>
              Kalan süre: {formatTimeRemaining(remainingMinutes)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={16} color="#3B82F6" />
            <Text style={styles.infoText}>
              {matchedLocations.length} eşleşme çevrimiçi
            </Text>
          </View>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && matchedLocations.length === 0 && !currentLocation && (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Henüz konum yok</Text>
          <Text style={styles.emptySubtitle}>
            Konum paylaşımını başlatarak eşleşmelerinizin konumlarını görebilirsiniz.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  controlsOverlay: {
    position: 'absolute',
    right: 16,
    top: 60,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sharingActiveButton: {
    backgroundColor: '#3B82F6',
    width: 'auto',
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  sharingInactiveButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 'auto',
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  infoPanel: {
    position: 'absolute',
    left: 16,
    top: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 180,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  currentUserMarker: {
    borderWidth: 3,
    borderColor: '#3B82F6',
    borderRadius: 25,
  },
  expiredMarker: {
    opacity: 0.5,
  },
  markerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  markerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  distanceBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  sharingIndicator: {
    position: 'absolute',
    bottom: -24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sharingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  sharingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
