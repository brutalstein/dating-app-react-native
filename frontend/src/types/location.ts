/**
 * Live Location Types
 * 
 * TypeScript interfaces for real-time location sharing feature.
 * Supports iOS and Android location permission models.
 */

export interface LiveLocationData {
  userId: string;
  firstName: string;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  recordedAt: string; // ISO 8601 datetime
  expiresAt: string; // ISO 8601 datetime
  isActive: boolean;
  sessionId?: string;
  distanceKm?: number;
  speedMps?: number;
  headingDegrees?: number;
  isOnline: boolean;
  lastSeen?: string;
}

export interface LiveLocationSharingStatus {
  enabled: boolean;
  expiresAt?: string;
  lastUpdatedAt?: string;
  featureEnabled: boolean;
}

export interface UpdateLocationParams {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  altitudeMeters?: number;
  speedMps?: number;
  headingDegrees?: number;
  batteryLevel?: number;
  isForeground?: boolean;
  sessionId?: string;
  recordedAt?: string;
}

export interface ToggleLocationSharingParams {
  enabled: boolean;
  durationMinutes?: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'blocked';
  foreground: boolean;
  background?: boolean;
}

export interface UseLiveLocationReturn {
  // State
  isEnabled: boolean;
  isSharing: boolean;
  isLoading: boolean;
  error: string | null;
  currentLocation: LiveLocationData | null;
  matchedLocations: LiveLocationData[];
  permissionStatus: LocationPermissionStatus | null;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  toggleSharing: (durationMinutes?: number) => Promise<void>;
  updateLocation: (params: UpdateLocationParams) => Promise<void>;
  fetchMatchedLocations: () => Promise<LiveLocationData[]>;
  stopSharing: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  
  // Metadata
  expiresAt?: string;
  remainingMinutes?: number;
  lastUpdatedAt?: string;
}

export interface LocationUpdateEvent {
  type: 'LOCATION_UPDATE';
  payload: LiveLocationData;
}

export interface LocationSharingStatusEvent {
  type: 'LOCATION_SHARING_STATUS';
  userId: string;
  isSharing: boolean;
}

export type LocationWebSocketMessage = 
  | LocationUpdateEvent 
  | LocationSharingStatusEvent;
