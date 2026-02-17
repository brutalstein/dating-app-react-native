import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { authService } from '@/services/authService';
import { profileService, UserProfile } from '@/services/profileService';

export default function SettingScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await authService.logout();
      router.replace('/(auth)/login' as any);
    } catch {
      Alert.alert('Error', 'Logout failed. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  const fullName = `${profile?.firstName || ''}${profile?.lastName ? ` ${profile.lastName}` : ''}`.trim() || '-';

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={['#1A0A0D', '#0B0B0B', '#000000']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 62, paddingBottom: 36 }}>
        <Text className="text-white text-3xl font-bold">Settings</Text>
        <Text className="text-zinc-400 mt-1">Account and session controls</Text>

        <View className="mt-6 bg-zinc-900/90 rounded-3xl p-5 border border-zinc-800 gap-4">
          <View>
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Name</Text>
            <Text className="text-white text-base font-semibold">{fullName}</Text>
          </View>

          <View>
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Email</Text>
            <Text className="text-white text-base font-semibold">{profile?.email || '-'}</Text>
          </View>

          <View>
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">University</Text>
            <Text className="text-white text-base font-semibold">{profile?.universityName || '-'}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/proactive-preferences' as any)}
          className="mt-6 h-14 rounded-2xl items-center justify-center bg-zinc-800 border border-zinc-700"
        >
          <Text className="text-white font-bold text-base">AI Proaktif Eşleşme Asistanı</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            const next = !(profile?.pushEnabled ?? true);
            await profileService.setPushPreference(next);
            setProfile((p) => (p ? { ...p, pushEnabled: next } : p));
          }}
          className="mt-3 h-14 rounded-2xl items-center justify-center bg-zinc-800 border border-zinc-700"
        >
          <Text className="text-white font-bold text-base">Push Bildirimleri: {(profile?.pushEnabled ?? true) ? 'Açık' : 'Kapalı'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/premium-purchase' as any)}
          className="mt-3 h-14 rounded-2xl items-center justify-center bg-[#FF5A5F]/20 border border-[#FF5A5F]/50"
        >
          <Text className="text-white font-bold text-base">Premium Satın Al</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/admin/moderation' as any)}
          className="mt-3 h-14 rounded-2xl items-center justify-center bg-zinc-800 border border-zinc-700"
        >
          <Text className="text-white font-bold text-base">Admin Moderasyon Paneli</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          className={`mt-3 h-14 rounded-2xl items-center justify-center ${loggingOut ? 'bg-zinc-700' : 'bg-[#FF5A5F]'}`}
        >
          <Text className="text-white font-bold text-base">{loggingOut ? 'Logging out...' : 'Logout'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
