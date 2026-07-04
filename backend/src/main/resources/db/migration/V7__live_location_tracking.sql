-- V7__live_location_tracking.sql
-- Live Location Tracking Feature for Real-time User Location Sharing
-- Supports iOS and Android location permission models
-- Privacy-first design: Only matched users can see each other's locations

-- Create live_locations table
CREATE TABLE IF NOT EXISTS live_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core location data (WGS84 coordinate system)
    latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    accuracy_meters REAL CHECK (accuracy_meters >= 0),
    altitude_meters DECIMAL(10, 2),
    speed_mps DECIMAL(6, 2) CHECK (speed_mps >= 0),
    heading_degrees INTEGER CHECK (heading_degrees >= 0 AND heading_degrees <= 360),
    
    -- Timestamps
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Session and platform tracking
    session_id UUID,
    platform VARCHAR(20) DEFAULT 'WEB',
    
    -- Device context
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    is_foreground BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_live_location_user ON live_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_live_location_expires ON live_locations(expires_at);
CREATE INDEX IF NOT EXISTS idx_live_location_active ON live_locations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_live_location_session ON live_locations(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_live_location_recorded ON live_locations(recorded_at DESC);

-- Composite index for finding active locations by user
CREATE INDEX IF NOT EXISTS idx_live_location_user_active ON live_locations(user_id, is_active, recorded_at DESC);

-- Add location fields to users table if not exists (for storing user's last known location)
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON TABLE live_locations IS 'Stores real-time user location data for live sharing feature. Locations expire automatically and are only visible to matched users.';
COMMENT ON COLUMN live_locations.latitude IS 'Latitude in decimal degrees (WGS84). Range: -90 to 90';
COMMENT ON COLUMN live_locations.longitude IS 'Longitude in decimal degrees (WGS84). Range: -180 to 180';
COMMENT ON COLUMN live_locations.accuracy_meters IS 'Horizontal accuracy of the location fix in meters';
COMMENT ON COLUMN live_locations.expires_at IS 'When this location record expires and should be hidden from other users';
COMMENT ON COLUMN live_locations.session_id IS 'Groups multiple location updates into a continuous tracking session';
COMMENT ON COLUMN live_locations.is_active IS 'Whether this location share is currently active. Set to false when user disables sharing or session expires';
COMMENT ON COLUMN live_locations.battery_level IS 'Device battery level percentage when location was recorded. Used for optimizing update frequency';
COMMENT ON COLUMN live_locations.is_foreground IS 'Whether location was obtained while app was in foreground (more accurate than background)';

-- Grant permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON live_locations TO bloom_app;
