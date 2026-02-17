import api from "@/api/config";
import * as SecureStore from 'expo-secure-store';

export interface UserProfile {
  firstName: string;
  lastName?: string;
  email: string;
  universityName: string;
  department?: string | null;
  birthDate?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bio?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | null;
  preference?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | null;
  relationshipIntent?: 'CASUAL' | 'SERIOUS' | 'FRIENDSHIP' | null;
  interests: string[];
  photoUrls: string[];
  onboardingCompleted: boolean;
  pushEnabled?: boolean;
}

export interface OnboardingPayload {
  birthDate: string;
  department?: string;
  heightCm: number;
  weightKg: number;
  bio?: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
  preference: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
  relationshipIntent: 'CASUAL' | 'SERIOUS' | 'FRIENDSHIP';
  interests: string[];
  photoUrls: string[];
}

const AVATAR_KEY_PREFIX = 'profile_avatar_uri_v1';

const normalizeEmail = (email?: string) => (email || '').trim().toLowerCase();

const toSafeKeyPart = (value: string) => {
  if (!value) {
    return 'anonymous';
  }

  return value.replace(/[^a-z0-9]/g, '_');
};

const avatarKeyForEmail = (email?: string) => {
  const normalizedEmail = normalizeEmail(email);
  return `${AVATAR_KEY_PREFIX}_${toSafeKeyPart(normalizedEmail)}`;
};

const legacyAvatarKeysForEmail = (email?: string) => {
  const normalizedEmail = normalizeEmail(email);

  return [
    normalizedEmail ? `profile_avatar_uri:${normalizedEmail}` : null,
    'profile_avatar_uri',
  ].filter(Boolean) as string[];
};

const getErrorMessage = (error: any, fallback: string) => {
  const responseData = error?.response?.data;

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};

export const profileService = {
  getProfile: async (): Promise<UserProfile> => {
    try {
      const res = await api.get('/auth/profile');
      return res.data as UserProfile;
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Failed to fetch profile data.'));
    }
  },

  completeOnboarding: async (payload: OnboardingPayload): Promise<UserProfile> => {
    try {
      const res = await api.post('/auth/onboarding', payload);
      return res.data as UserProfile;
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Failed to complete onboarding.'));
    }
  },

  updatePhotos: async (photoUrls: string[]): Promise<UserProfile> => {
    try {
      const res = await api.put('/auth/profile/photos', { photoUrls });
      return res.data as UserProfile;
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Failed to update profile photos.'));
    }
  },

  setPushPreference: async (pushEnabled: boolean): Promise<void> => {
    try {
      await api.put('/push/preferences', { pushEnabled });
    } catch (error: any) {
      throw new Error(getErrorMessage(error, 'Failed to update push preference.'));
    }
  },

  getLocalAvatarUri: async (email?: string): Promise<string | null> => {
    const primaryKey = avatarKeyForEmail(email);
    const primaryValue = await SecureStore.getItemAsync(primaryKey);

    if (primaryValue) {
      return primaryValue;
    }

    // Backward compatibility + migration from previous key formats.
    for (const legacyKey of legacyAvatarKeysForEmail(email)) {
      const legacyValue = await SecureStore.getItemAsync(legacyKey);
      if (!legacyValue) {
        continue;
      }

      await SecureStore.setItemAsync(primaryKey, legacyValue);
      await SecureStore.deleteItemAsync(legacyKey);
      return legacyValue;
    }

    return null;
  },

  setLocalAvatarUri: async (uri: string, email?: string) => {
    await SecureStore.setItemAsync(avatarKeyForEmail(email), uri);
  },

  clearLocalAvatarUri: async (email?: string) => {
    await SecureStore.deleteItemAsync(avatarKeyForEmail(email));

    for (const legacyKey of legacyAvatarKeysForEmail(email)) {
      await SecureStore.deleteItemAsync(legacyKey);
    }
  },
};
