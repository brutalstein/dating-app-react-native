import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { authService } from '@/services/authService';
import { profileService, UserProfile } from '@/services/profileService';
import { safetyService, PrivacySettings } from '@/services/safetyService';
import { canUseAdminPanel } from '@/components/admin/moderation-ui';

const BLOOM = '#FF5A5F';

type SettingToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => Promise<void>;
  disabled?: boolean;
};

function SettingToggleRow({ title, description, value, onValueChange, disabled }: SettingToggleRowProps) {
  const [updating, setUpdating] = useState(false);

  const handleValueChange = async (next: boolean) => {
    if (disabled || updating) {
      return;
    }

    setUpdating(true);
    try {
      await onValueChange(next);
    } catch (error: any) {
      Alert.alert('Güncellenemedi', error?.message || 'Lütfen tekrar dene.');
    } finally {
      setUpdating(false);
    }
  };

  const accessibilityHint = useMemo(
    () => `${title} ayarı şu an ${value ? 'açık' : 'kapalı'}. Değiştirmek için iki kez dokun.`,
    [title, value]
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || updating}
      onPress={() => handleValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled: Boolean(disabled || updating) }}
      className="bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-4 flex-row items-center"
    >
      <View className="flex-1 pr-3">
        <Text className="text-white font-semibold text-base">{title}</Text>
        <Text className="text-zinc-400 text-sm mt-1">{description}</Text>
      </View>
      <View className="items-end">
        <Switch
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled || updating}
          trackColor={{ false: '#3f3f46', true: 'rgba(255,90,95,0.55)' }}
          thumbColor={value ? BLOOM : '#f4f4f5'}
          ios_backgroundColor="#3f3f46"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        {updating ? <ActivityIndicator size="small" color={BLOOM} style={{ marginTop: 6 }} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [data, privacyData] = await Promise.all([profileService.getProfile(), safetyService.getPrivacy()]);
      setProfile(data);
      setPrivacy(privacyData);
    } catch (error: any) {
      Alert.alert('Ayarlar yüklenemedi', error?.message || 'Lütfen tekrar dene.');
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
      Alert.alert('Çıkış yapılamadı', 'Lütfen tekrar dene.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color={BLOOM} />
      </View>
    );
  }

  const fullName = `${profile?.firstName || ''}${profile?.lastName ? ` ${profile.lastName}` : ''}`.trim() || '-';

  return (
    <View className="flex-1 bg-black">
      <LinearGradient colors={['#1A0A0D', '#0B0B0B', '#000000']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 62, paddingBottom: 36 }}>
        <Text className="text-white text-3xl font-bold">Ayarlar</Text>
        <Text className="text-zinc-400 mt-1">Hesabını buradan kolayca yönet.</Text>

        <View className="mt-6 bg-zinc-900/90 rounded-3xl p-5 border border-zinc-800 gap-4">
          <View>
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Ad Soyad</Text>
            <Text className="text-white text-base font-semibold">{fullName}</Text>
          </View>

          <View>
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">E-posta</Text>
            <Text className="text-white text-base font-semibold">{profile?.email || '-'}</Text>
          </View>

          <View>
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Üniversite</Text>
            <Text className="text-white text-base font-semibold">{profile?.universityName || '-'}</Text>
          </View>
        </View>

        <View className="mt-6 gap-3">
          <SettingToggleRow
            title="Anlık bildirimler"
            description="Yeni mesaj ve eşleşmeleri anında haber ver."
            value={profile?.pushEnabled ?? true}
            onValueChange={async (next) => {
              await profileService.setPushPreference(next);
              setProfile((prev) => (prev ? { ...prev, pushEnabled: next } : prev));
            }}
          />

          <SettingToggleRow
            title="Profili gizle"
            description="Açıkken profilini sadece eşleştiğin kişiler görür."
            value={privacy?.profileVisibility === 'MATCHES_ONLY'}
            onValueChange={async (next) => {
              const updated = await safetyService.updatePrivacy({
                profileVisibility: next ? 'MATCHES_ONLY' : 'PUBLIC',
              });
              setPrivacy(updated);
            }}
          />

          <SettingToggleRow
            title="Son görülmeyi gizle"
            description="Açıkken son görülmen görünmez."
            value={privacy?.lastSeenVisibility === 'NOBODY'}
            onValueChange={async (next) => {
              const updated = await safetyService.updatePrivacy({
                lastSeenVisibility: next ? 'NOBODY' : 'EVERYONE',
              });
              setPrivacy(updated);
            }}
          />

          <SettingToggleRow
            title="Mesaj isteği filtresi"
            description="Açıkken sadece eşleştiğin kişiler mesaj isteği gönderebilir."
            value={privacy?.messageRequestPolicy === 'MATCHES_ONLY'}
            onValueChange={async (next) => {
              const updated = await safetyService.updatePrivacy({
                messageRequestPolicy: next ? 'MATCHES_ONLY' : 'EVERYONE',
              });
              setPrivacy(updated);
            }}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push('/proactive-preferences' as any)}
          className="mt-6 h-14 rounded-2xl items-center justify-center bg-zinc-800 border border-zinc-700"
        >
          <Text className="text-white font-bold text-base">Akıllı eşleşme asistanı</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/premium-purchase' as any)}
          className="mt-3 h-14 rounded-2xl items-center justify-center bg-[#FF5A5F]/20 border border-[#FF5A5F]/50"
        >
          <Text className="text-white font-bold text-base">Premiuma geç</Text>
        </TouchableOpacity>

        {canUseAdminPanel(profile?.role as any) && (
          <TouchableOpacity
            onPress={() => router.push('/admin/moderation' as any)}
            className="mt-3 h-14 rounded-2xl items-center justify-center bg-zinc-800 border border-zinc-700"
          >
            <Text className="text-white font-bold text-base">Moderasyon paneli</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          className={`mt-3 h-14 rounded-2xl items-center justify-center ${loggingOut ? 'bg-zinc-700' : 'bg-[#FF5A5F]'}`}
        >
          <Text className="text-white font-bold text-base">{loggingOut ? 'Çıkış yapılıyor...' : 'Çıkış yap'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
