/**
 * Hook for managing live location tracking functionality
 * 
 * Features:
 * - Request and manage location permissions (iOS/Android)
 * - Start/stop live location sharing sessions
 * - Real-time location updates to backend
 * - Battery-optimized update intervals
 * - Background location support (with user permission)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import api from '@/api/config';
import { useAuth } from './useAuth';

export interface LiveLocationState {
  /** Whether location sharing is currently enabled */
  isEnabled: boolean;
  /** Whether location services are available on device */
  isLocationAvailable: boolean;
  /** Whether user has granted location permission */
  hasPermission: boolean | null;
  /** Current location coordinates */
  currentLocation: Location.LocationObjectCoords | null;
  /** When location sharing expires */
  expiresAt: string | null;
  /** Last update timestamp */
  lastUpdatedAt: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Number of matched users sharing their locations */
  matchedUsersSharingCount: number;
}

export interface MatchedUserLocation {
  userId: string;
  firstName: string;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  recordedAt: string;
  expiresAt: string;
  isActive: boolean;
  distanceKm?: number;
  isOnline: boolean;
  lastSeen: string;
}

const LOCATION_UPDATE_INTERVAL_MS = 30000; // 30 seconds
const BACKGROUND_UPDATE_INTERVAL_MS = 60000; // 1 minute in background
const MIN_ACCURACY_METERS = 50; // Minimum acceptable accuracy

export function useLiveLocation() {
  const { user } = useAuth();
  const [state, setState] = useState<LiveLocationState>({
    isEnabled: false,
    isLocationAvailable: true,
    hasPermission: null,
    currentLocation: null,
    expiresAt: null,
    lastUpdatedAt: null,
    isLoading: false,
    error: null,
    matchedUsersSharingCount: 0,
  });

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Check and request location permissions
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        setState(prev => ({ ...prev, hasPermission: true }));
        return true;
      }

      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      setState(prev => ({ ...prev, hasPermission: newStatus === 'granted' }));
      
      if (newStatus !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          error: 'Konum erişimi gereklidir. Lütfen ayarlardan izin verin.' 
        }));
        return false;
      }

      // Request background permissions for continuous tracking
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          const { status: newBgStatus } = await Location.requestBackgroundPermissionsAsync();
          console.log('Background permission:', newBgStatus);
          // Don't fail if background permission is denied, just log it
        }
      }

      return newStatus === 'granted';
    } catch (error: any) {
      console.error('Location permission error:', error);
      setState(prev => ({ 
        ...prev, 
        hasPermission: false,
        error: error.message || 'Konum izni alınamadı'
      }));
      return false;
    }
  }, []);

  /**
   * Get current location sharing status from backend
   */
  const fetchSharingStatus = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/location/sharing/status');
      const status = response.data;
      
      setState(prev => ({
        ...prev,
        isEnabled: status.enabled,
        expiresAt: status.expiresAt,
        lastUpdatedAt: status.lastUpdatedAt,
      }));
    } catch (error: any) {
      console.error('Failed to fetch location sharing status:', error);
    }
  }, [user]);

  /**
   * Get matched users' locations
   */
  const fetchMatchedLocations = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/location/matches');
      const data = response.data;
      
      setState(prev => ({
        ...prev,
        matchedUsersSharingCount: data.totalCount || 0,
      }));
      
      return data.locations as MatchedUserLocation[];
    } catch (error: any) {
      console.error('Failed to fetch matched locations:', error);
      return [];
    }
  }, [user]);

  /**
   * Send location update to backend
   */
  const sendLocationUpdate = useCallback(async (
    location: Location.LocationObjectCoords,
    isForeground: boolean = true
  ) => {
    if (!user) return;

    try {
      // Generate or reuse session ID
      if (!sessionIdRef.current) {
        sessionIdRef.current = crypto.randomUUID();
      }

      await api.post('/location/update', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracy,
        altitudeMeters: location.altitude,
        speedMps: location.speed,
        headingDegrees: location.heading,
        recordedAt: new Date(location.timestamp).toISOString(),
        sessionId: sessionIdRef.current,
        batteryLevel: undefined, // Could be obtained from expo-battery
        isForeground,
      }, {
        headers: {
          'X-Platform': Platform.OS.toUpperCase(),
        },
      });

      setState(prev => ({
        ...prev,
        currentLocation: location,
        lastUpdatedAt: new Date().toISOString(),
        error: null,
      }));
    } catch (error: any) {
      console.error('Failed to send location update:', error);
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Konum güncellenemedi',
      }));
    }
  }, [user]);

  /**
   * Enable live location sharing
   */
  const enableSharing = useCallback(async (durationMinutes: number = 60) => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // First ensure we have permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Get initial location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 0,
        maxWaitTime: 10000,
      });

      // Check accuracy
      if (currentLocation.coords.accuracy > MIN_ACCURACY_METERS) {
        console.warn('Low accuracy location:', currentLocation.coords.accuracy);
        // Continue anyway but warn user
      }

      // Enable sharing on backend
      const response = await api.post('/location/sharing/toggle', {
        enabled: true,
        durationMinutes,
      });

      sessionIdRef.current = crypto.randomUUID();

      setState(prev => ({
        ...prev,
        isEnabled: true,
        expiresAt: response.data.expiresAt,
        currentLocation: currentLocation.coords,
        lastUpdatedAt: new Date().toISOString(),
        isLoading: false,
      }));

      // Send initial location update
      await sendLocationUpdate(currentLocation.coords);

      // Start watching position
      startWatchingLocation();

    } catch (error: any) {
      console.error('Failed to enable location sharing:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.message || 'Konum paylaşımı başlatılamadı',
      }));
    }
  }, [user, requestPermission, sendLocationUpdate]);

  /**
   * Disable live location sharing
   */
  const disableSharing = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await api.post('/location/sharing/toggle', {
        enabled: false,
      });

      stopWatchingLocation();
      sessionIdRef.current = null;

      setState(prev => ({
        ...prev,
        isEnabled: false,
        expiresAt: null,
        isLoading: false,
        currentLocation: null,
      }));
    } catch (error: any) {
      console.error('Failed to disable location sharing:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.message || 'Konum paylaşımı durdurulamadı',
      }));
    }
  }, [user]);

  /**
   * Start watching location changes
   */
  const startWatchingLocation = useCallback(async () => {
    try {
      // Clear any existing watchers
      stopWatchingLocation();

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_UPDATE_INTERVAL_MS,
          distanceInterval: 10, // Update every 10 meters
        },
        async (location) => {
          // Only update if accuracy is reasonable
          if (location.coords.accuracy <= MIN_ACCURACY_METERS) {
            await sendLocationUpdate(location.coords, true);
          } else {
            console.debug('Skipping low accuracy location:', location.coords.accuracy);
          }
        }
      );

      locationSubscriptionRef.current = subscription;
      console.log('Location watching started');
    } catch (error: any) {
      console.error('Failed to start location watching:', error);
    }
  }, [sendLocationUpdate]);

  /**
   * Stop watching location changes
   */
  const stopWatchingLocation = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
      console.log('Location watching stopped');
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  /**
   * Toggle location sharing on/off
   */
  const toggleSharing = useCallback(async () => {
    if (state.isEnabled) {
      await disableSharing();
    } else {
      await enableSharing();
    }
  }, [state.isEnabled, enableSharing, disableSharing]);

  // Initial setup when component mounts
  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, isEnabled: false }));
      return;
    }

    // Check if location services are available
    const checkLocationServices = async () => {
      try {
        const isAvailable = await Location.hasServicesEnabledAsync();
        setState(prev => ({ ...prev, isLocationAvailable: isAvailable }));
        
        if (isAvailable) {
          await fetchSharingStatus();
        }
      } catch (error) {
        console.error('Location services check failed:', error);
        setState(prev => ({ ...prev, isLocationAvailable: false }));
      }
    };

    checkLocationServices();

    // Cleanup on unmount
    return () => {
      stopWatchingLocation();
    };
  }, [user, fetchSharingStatus, stopWatchingLocation]);

  // Periodic status refresh when enabled
  useEffect(() => {
    if (!state.isEnabled || !user) return;

    const interval = setInterval(async () => {
      await fetchSharingStatus();
      
      // Check if expired
      if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
        console.log('Location sharing expired');
        await disableSharing();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [state.isEnabled, state.expiresAt, user, fetchSharingStatus, disableSharing]);

  return {
    ...state,
    requestPermission,
    enableSharing,
    disableSharing,
    toggleSharing,
    fetchMatchedLocations,
    startWatchingLocation,
    stopWatchingLocation,
  };
}
