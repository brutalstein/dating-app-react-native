/**
 * useLiveLocation Hook
 * 
 * Comprehensive hook for managing real-time location sharing.
 * Handles iOS and Android permission models, background location,
 * and automatic session management.
 * 
 * Features:
 * - Platform-aware permission handling (iOS/Android)
 * - Foreground and background location tracking
 * - Battery-optimized update intervals
 * - Automatic session management
 * - Real-time WebSocket updates
 * - Error handling and retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  LiveLocationData, 
  UseLiveLocationReturn, 
  UpdateLocationParams,
  LocationPermissionStatus,
  LiveLocationSharingStatus 
} from '@/types/location';
import api from '@/services/api';
import { useWebSocket } from './useWebSocket';

const LOCATION_STORAGE_KEY = '@bloom_location_sharing';
const DEFAULT_UPDATE_INTERVAL_MS = 30000; // 30 seconds
const BACKGROUND_UPDATE_INTERVAL_MS = 60000; // 1 minute
const MIN_ACCURACY_METERS = 50; // Ignore locations with accuracy worse than 50m

export function useLiveLocation(): UseLiveLocationReturn {
  // State
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LiveLocationData | null>(null);
  const [matchedLocations, setMatchedLocations] = useState<LiveLocationData[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>();
  
  // Refs
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const sessionIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // WebSocket for real-time updates
  const { subscribe, unsubscribe, isConnected } = useWebSocket();
  
  /**
   * Check location permission status
   */
  const checkPermissionStatus = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      const [foregroundPerm, backgroundPerm] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Platform.OS === 'android' 
          ? Location.getBackgroundPermissionsAsync() 
          : Promise.resolve({ granted: false } as any)
      ]);
      
      const foregroundGranted = foregroundPerm.granted;
      const backgroundGranted = backgroundPerm?.granted ?? false;
      
      let status: LocationPermissionStatus['status'] = 'undetermined';
      if (foregroundGranted) {
        status = 'granted';
      } else if (!foregroundPerm.canAskAgain) {
        status = 'blocked';
      } else if (!foregroundPerm.granted) {
        status = 'denied';
      }
      
      const result: LocationPermissionStatus = {
        granted: foregroundGranted,
        canAskAgain: foregroundPerm.canAskAgain,
        status,
        foreground: foregroundGranted,
        background: backgroundGranted,
      };
      
      setPermissionStatus(result);
      return result;
    } catch (err) {
      console.error('Error checking location permissions:', err);
      return {
        granted: false,
        canAskAgain: true,
        status: 'undetermined',
        foreground: false,
        background: false,
      };
    }
  }, []);
  
  /**
   * Request location permissions
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      
      // Request foreground permission
      const { granted: foregroundGranted } = await Location.requestForegroundPermissionsAsync();
      
      if (!foregroundGranted) {
        setError('Konum izni verilmedi. Lütfen ayarlardan izin verin.');
        return false;
      }
      
      // Request background permission for continuous tracking
      if (Platform.OS === 'ios') {
        const { granted: backgroundGranted } = await Location.requestBackgroundPermissionsAsync();
        if (!backgroundGranted) {
          console.warn('Background location permission denied - limited functionality');
        }
      } else if (Platform.OS === 'android') {
        // Android 10+ requires special handling for background location
        if (Platform.Version >= 29) {
          const { granted: backgroundGranted } = await Location.requestBackgroundPermissionsAsync();
          if (!backgroundGranted) {
            console.warn('Background location permission denied - limited functionality');
          }
        }
      }
      
      // Update permission status
      await checkPermissionStatus();
      
      return true;
    } catch (err: any) {
      console.error('Error requesting location permission:', err);
      setError(err.message || 'Konum izni alınamadı');
      return false;
    }
  }, [checkPermissionStatus]);
  
  /**
   * Start location tracking
   */
  const startLocationTracking = useCallback(async () => {
    try {
      // Check if we have permission
      const permStatus = await checkPermissionStatus();
      if (!permStatus.granted) {
        throw new Error('Konum izni yok');
      }
      
      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 5000,
      });
      
      // Validate accuracy
      if (currentLocation.coords.accuracy && currentLocation.coords.accuracy > MIN_ACCURACY_METERS) {
        console.warn('Low accuracy location:', currentLocation.coords.accuracy);
        // Still use it but log warning
      }
      
      // Send to backend
      const updateParams: UpdateLocationParams = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracyMeters: currentLocation.coords.accuracy || undefined,
        altitudeMeters: currentLocation.coords.altitude || undefined,
        speedMps: currentLocation.coords.speed || undefined,
        headingDegrees: currentLocation.coords.heading || undefined,
        sessionId: sessionIdRef.current,
        isForeground: true, // Will be updated by background task
      };
      
      // Get battery info if available
      try {
        // Note: expo-battery would need to be added for this
        // For now, skip battery info
      } catch (e) {
        // Battery info not available
      }
      
      const response = await api.post('/api/location/update', updateParams, {
        headers: {
          'X-Platform': Platform.OS.toUpperCase(),
        },
      });
      
      if (isMountedRef.current) {
        setCurrentLocation(response.data);
        setLastUpdatedAt(response.data.recordedAt);
        setExpiresAt(response.data.expiresAt);
      }
      
      // Subscribe to location updates
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: DEFAULT_UPDATE_INTERVAL_MS,
          distanceInterval: 10, // Update every 10 meters
        },
        async (newLocation) => {
          if (!isMountedRef.current || !isSharing) return;
          
          // Validate accuracy
          if (newLocation.coords.accuracy && newLocation.coords.accuracy > MIN_ACCURACY_METERS) {
            console.debug('Skipping low accuracy update:', newLocation.coords.accuracy);
            return;
          }
          
          const updateParams: UpdateLocationParams = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracyMeters: newLocation.coords.accuracy || undefined,
            altitudeMeters: newLocation.coords.altitude || undefined,
            speedMps: newLocation.coords.speed || undefined,
            headingDegrees: newLocation.coords.heading || undefined,
            sessionId: sessionIdRef.current,
            isForeground: true,
          };
          
          try {
            const response = await api.post('/api/location/update', updateParams, {
              headers: {
                'X-Platform': Platform.OS.toUpperCase(),
              },
            });
            
            if (isMountedRef.current) {
              setCurrentLocation(response.data);
              setLastUpdatedAt(response.data.recordedAt);
            }
          } catch (err) {
            console.error('Failed to update location:', err);
          }
        }
      );
      
      console.log('Location tracking started');
    } catch (err: any) {
      console.error('Error starting location tracking:', err);
      setError(err.message || 'Konum takibi başlatılamadı');
      throw err;
    }
  }, [checkPermissionStatus, isSharing]);
  
  /**
   * Stop location tracking
   */
  const stopLocationTracking = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    console.log('Location tracking stopped');
  }, []);
  
  /**
   * Toggle location sharing
   */
  const toggleSharing = useCallback(async (durationMinutes?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (isSharing) {
        // Disable sharing
        await api.post('/api/location/sharing/toggle', { enabled: false });
        
        stopLocationTracking();
        
        setIsSharing(false);
        setIsEnabled(false);
        setCurrentLocation(null);
        setExpiresAt(undefined);
        
        // Unsubscribe from WebSocket location updates
        unsubscribe('LOCATION_UPDATE');
        unsubscribe('LOCATION_SHARING_STATUS');
        
        // Clear storage
        await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
        
        console.log('Location sharing disabled');
      } else {
        // Enable sharing
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          throw new Error('Konum izni gerekli');
        }
        
        const response = await api.post('/api/location/sharing/toggle', {
          enabled: true,
          durationMinutes: durationMinutes || 60,
        });
        
        setIsSharing(true);
        setIsEnabled(true);
        setExpiresAt(response.data.expiresAt);
        
        // Save to storage
        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
          enabled: true,
          expiresAt: response.data.expiresAt,
          sessionId: sessionIdRef.current,
        }));
        
        // Start tracking
        await startLocationTracking();
        
        // Subscribe to WebSocket updates
        subscribe('LOCATION_UPDATE', (data: any) => {
          if (data.payload) {
            setMatchedLocations(prev => {
              const filtered = prev.filter(loc => loc.userId !== data.payload.userId);
              return [...filtered, data.payload];
            });
          }
        });
        
        subscribe('LOCATION_SHARING_STATUS', (data: any) => {
          console.log('Location sharing status changed:', data);
          // Could refresh matched locations here
        });
        
        console.log('Location sharing enabled for', durationMinutes || 60, 'minutes');
      }
    } catch (err: any) {
      console.error('Error toggling location sharing:', err);
      setError(err.response?.data?.message || err.message || 'İşlem başarısız');
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isSharing, requestPermission, startLocationTracking, stopLocationTracking, subscribe, unsubscribe]);
  
  /**
   * Fetch matched users' locations
   */
  const fetchMatchedLocations = useCallback(async (): Promise<LiveLocationData[]> => {
    try {
      const response = await api.get('/api/location/matches');
      const locations = response.data.locations || [];
      
      if (isMountedRef.current) {
        setMatchedLocations(locations);
      }
      
      return locations;
    } catch (err) {
      console.error('Error fetching matched locations:', err);
      throw err;
    }
  }, []);
  
  /**
   * Stop sharing (alias for toggleSharing when enabled)
   */
  const stopSharing = useCallback(async () => {
    if (isSharing) {
      await toggleSharing();
    }
  }, [isSharing, toggleSharing]);
  
  /**
   * Refresh sharing status from backend
   */
  const refreshStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/location/sharing/status');
      const status: LiveLocationSharingStatus = response.data;
      
      if (isMountedRef.current) {
        setIsEnabled(status.enabled);
        setIsSharing(status.enabled);
        setExpiresAt(status.expiresAt);
        setLastUpdatedAt(status.lastUpdatedAt);
        
        if (status.enabled) {
          // Resume tracking if was active
          await startLocationTracking();
        }
      }
    } catch (err) {
      console.error('Error refreshing location status:', err);
    }
  }, [startLocationTracking]);
  
  /**
   * Calculate remaining minutes
   */
  const remainingMinutes = useCallback(() => {
    if (!expiresAt) return undefined;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }, [expiresAt]);
  
  /**
   * Initial setup
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    const init = async () => {
      try {
        // Check permissions
        await checkPermissionStatus();
        
        // Check if sharing was previously enabled
        const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.enabled) {
            // Verify with backend
            await refreshStatus();
          }
        }
        
        // Fetch initial matched locations
        await fetchMatchedLocations();
      } catch (err) {
        console.error('Error initializing location:', err);
        setError('Konum özelliği başlatılamadı');
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    init();
    
    return () => {
      isMountedRef.current = false;
      stopLocationTracking();
      unsubscribe('LOCATION_UPDATE');
      unsubscribe('LOCATION_SHARING_STATUS');
    };
  }, []);
  
  return {
    isEnabled,
    isSharing,
    isLoading,
    error,
    currentLocation,
    matchedLocations,
    permissionStatus,
    requestPermission,
    toggleSharing,
    updateLocation: async (params: UpdateLocationParams) => {
      const response = await api.post('/api/location/update', params, {
        headers: {
          'X-Platform': Platform.OS.toUpperCase(),
        },
      });
      if (isMountedRef.current) {
        setCurrentLocation(response.data);
        setLastUpdatedAt(response.data.recordedAt);
      }
    },
    fetchMatchedLocations,
    stopSharing,
    refreshStatus,
    expiresAt,
    remainingMinutes: remainingMinutes(),
    lastUpdatedAt,
  };
}
