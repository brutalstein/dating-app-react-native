import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';

import { profileService, UserProfile } from '@/services/profileService';

const genderLabelMap: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  NON_BINARY: 'Non-binary',
  OTHER: 'Other',
};

const relationshipIntentLabelMap: Record<string, string> = {
  CASUAL: 'Casual',
  SERIOUS: 'Serious',
  FRIENDSHIP: 'Friendship',
};

const toPersistablePhotoValue = (asset?: ImagePickerAsset): string | null => {
  if (!asset) {
    return null;
  }

  if (asset.base64) {
    const mime = asset.mimeType || 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }

  return asset.uri || null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPhotos, setUpdatingPhotos] = useState(false);

  const loadProfile = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (error: any) {
      Alert.alert('Profile Error', error?.message || 'Profile could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const savePhotos = async (nextPhotos: string[]) => {
    if (nextPhotos.length < 3 || nextPhotos.length > 8) {
      Alert.alert('Photo Rules', 'You must keep between 3 and 8 photos.');
      return;
    }

    setUpdatingPhotos(true);
    try {
      const updated = await profileService.updatePhotos(nextPhotos);
      setProfile(updated);
    } catch (error: any) {
      Alert.alert('Photo Update Failed', error?.message || 'Could not update photos.');
    } finally {
      setUpdatingPhotos(false);
    }
  };

  const pickSinglePhoto = async (fromCamera: boolean): Promise<string | null> => {
    if (fromCamera) {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPerm.granted) {
        Alert.alert('Permission Needed', 'Camera permission is required.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.75,
        allowsEditing: true,
        aspect: [4, 5],
        base64: true,
      });

      if (!result.canceled) {
        return toPersistablePhotoValue(result.assets?.[0]);
      }
      return null;
    }

    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPerm.granted) {
      Alert.alert('Permission Needed', 'Gallery permission is required.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: true,
      aspect: [4, 5],
      base64: true,
    });

    if (!result.canceled) {
      return toPersistablePhotoValue(result.assets?.[0]);
    }

    return null;
  };

  const addPhoto = () => {
    if (!profile) return;
    if ((profile.photoUrls?.length || 0) >= 8) {
      Alert.alert('Photo Limit', 'You can upload up to 8 photos.');
      return;
    }

    Alert.alert('Add Photo', 'Select source', [
      {
        text: 'Camera',
        onPress: async () => {
          const uri = await pickSinglePhoto(true);
          if (!uri) return;
          await savePhotos([...(profile.photoUrls || []), uri]);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const uri = await pickSinglePhoto(false);
          if (!uri) return;
          await savePhotos([...(profile.photoUrls || []), uri]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const replacePhoto = (index: number) => {
    if (!profile) return;

    Alert.alert('Replace Photo', 'Select source', [
      {
        text: 'Camera',
        onPress: async () => {
          const uri = await pickSinglePhoto(true);
          if (!uri) return;
          const next = [...(profile.photoUrls || [])];
          next[index] = uri;
          await savePhotos(next);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const uri = await pickSinglePhoto(false);
          if (!uri) return;
          const next = [...(profile.photoUrls || [])];
          next[index] = uri;
          await savePhotos(next);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removePhoto = async (index: number) => {
    if (!profile) return;
    const current = profile.photoUrls || [];

    if (current.length <= 3) {
      Alert.alert('Minimum Photo Rule', 'You must keep at least 3 photos.');
      return;
    }

    const next = current.filter((_, i) => i !== index);
    await savePhotos(next);
  };

  const ageText = useMemo(() => {
    if (profile?.age == null) return '-';
    return `${profile.age}`;
  }, [profile?.age]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={['#1A0A0D', '#0B0B0B', '#000000']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 62, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor="#FF5A5F" />}
      >
        <Text className="text-white text-3xl font-bold">Profile</Text>
        <Text className="text-zinc-400 mt-1">Your dating profile and about section</Text>

        <View className="mt-6 bg-zinc-900/90 rounded-3xl p-5 border border-zinc-800">
          <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-2">About</Text>
          <Text className="text-white text-base leading-6">{profile?.bio || 'No bio yet.'}</Text>

          <View className="flex-row flex-wrap gap-2 mt-4">
            <View className="bg-zinc-800 px-3 py-2 rounded-full">
              <Text className="text-zinc-200 text-xs">Age: {ageText}</Text>
            </View>
            <View className="bg-zinc-800 px-3 py-2 rounded-full">
              <Text className="text-zinc-200 text-xs">Department: {profile?.department || '-'}</Text>
            </View>
            <View className="bg-zinc-800 px-3 py-2 rounded-full">
              <Text className="text-zinc-200 text-xs">Gender: {profile?.gender ? genderLabelMap[profile.gender] : '-'}</Text>
            </View>
            <View className="bg-zinc-800 px-3 py-2 rounded-full">
              <Text className="text-zinc-200 text-xs">Looking for: {profile?.preference ? genderLabelMap[profile.preference] : '-'}</Text>
            </View>
            <View className="bg-zinc-800 px-3 py-2 rounded-full">
              <Text className="text-zinc-200 text-xs">Relationship: {profile?.relationshipIntent ? relationshipIntentLabelMap[profile.relationshipIntent] : '-'}</Text>
            </View>
            <View className="bg-zinc-800 px-3 py-2 rounded-full">
              <Text className="text-zinc-200 text-xs">Height: {profile?.heightCm ? `${profile.heightCm} cm` : '-'}</Text>
            </View>
            <View className="bg-zinc-800 px-3 py-2 rounded-full">
              <Text className="text-zinc-200 text-xs">Weight: {profile?.weightKg ? `${profile.weightKg} kg` : '-'}</Text>
            </View>
          </View>
        </View>

        <View className="mt-5 bg-zinc-900/90 rounded-3xl p-5 border border-zinc-800">
          <Text className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Interests</Text>
          <View className="flex-row flex-wrap gap-2">
            {(profile?.interests || []).length > 0 ? (
              (profile?.interests || []).map((interest) => (
                <View key={interest} className="bg-[#FF5A5F]/20 border border-[#FF5A5F]/40 px-3 py-2 rounded-full">
                  <Text className="text-[#FF9CA0] text-xs">{interest}</Text>
                </View>
              ))
            ) : (
              <Text className="text-zinc-500">No interests yet.</Text>
            )}
          </View>
        </View>

        <View className="mt-5 bg-zinc-900/90 rounded-3xl p-5 border border-zinc-800">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-zinc-400 text-xs uppercase tracking-wider">Photos (3-8)</Text>
            {updatingPhotos && <ActivityIndicator size="small" color="#FF5A5F" />}
          </View>

          <View className="flex-row flex-wrap gap-3">
            {(profile?.photoUrls || []).map((uri, index) => (
              <View key={`${uri}-${index}`} className="relative">
                <TouchableOpacity onPress={() => replacePhoto(index)}>
                  <Image source={{ uri }} style={{ width: 96, height: 126, borderRadius: 14 }} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {(profile?.photoUrls || []).length < 8 && (
              <TouchableOpacity
                onPress={addPhoto}
                className="w-[96px] h-[126px] rounded-xl border border-dashed border-zinc-600 items-center justify-center bg-zinc-800"
              >
                <Ionicons name="add" size={26} color="#FF5A5F" />
                <Text className="text-zinc-400 text-xs mt-1">Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
