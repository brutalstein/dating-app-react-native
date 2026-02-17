import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import AuroraBackground from '@/components/ui/aurora-background';
import BloomBrand from '@/components/ui/bloom-brand';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Eksik Bilgi', 'Lütfen e-posta ve şifreni gir.');
      return;
    }

    setLoading(true);
    try {
      await authService.login(normalizedEmail, password);
      const profile = await profileService.getProfile();
      router.replace((profile.onboardingCompleted ? '/(tabs)' : '/onboarding') as any);
    } catch (error: any) {
      const message = error?.message || 'Giriş yapılamadı. Lütfen tekrar dene.';
      if (message.toLowerCase().includes('verify')) {
        Alert.alert('Doğrulama Gerekli', message, [
          { text: 'Doğrulama Ekranına Git', onPress: () => router.push(`/(auth)/verify?email=${encodeURIComponent(normalizedEmail)}` as any) },
          { text: 'Vazgeç', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Giriş Başarısız', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <AuroraBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-6" keyboardShouldPersistTaps="handled">
          <View className="mb-10">
            <BloomBrand subtitle="Kampüste gerçek bağlantılar kur." />
          </View>

          <View className="bg-black/45 border border-white/15 rounded-3xl p-5">
            <TextInput
              placeholder="Üniversite e-postası (.edu.tr)"
              placeholderTextColor="#A1A1AA"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-zinc-900/80 text-white h-14 px-4 rounded-xl border border-zinc-700 mb-3"
            />

            <View className="bg-zinc-900/80 h-14 px-4 rounded-xl border border-zinc-700 mb-5 flex-row items-center">
              <TextInput
                placeholder="Şifre"
                placeholderTextColor="#A1A1AA"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                className="flex-1 text-white"
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#D4D4D8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className={`h-14 rounded-xl items-center justify-center ${loading ? 'bg-zinc-700' : 'bg-[#A78BFA]'}`}
            >
              <Text className="text-white font-bold text-base">{loading ? 'Giriş yapılıyor...' : 'Bloom’a Giriş Yap'}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-zinc-300">Hesabın yok mu? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
              <Text className="text-cyan-300 font-semibold">Kaydol</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
