import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import AuthInput from '@/components/ui/auth-input';

const loginBackgroundGif = require('../../assets/images/pet-lover.gif');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <Image source={loginBackgroundGif} className="absolute w-full h-full opacity-80" resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.58)', 'rgba(0,0,0,0.80)']}
        locations={[0, 0.45, 1]}
        className="absolute w-full h-full"
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-6" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-10">
            <View className="w-24 h-24 bg-zinc-900/90 rounded-3xl items-center justify-center mb-6 border border-zinc-600">
              <Ionicons name="flame" size={48} color="#FF5A5F" />
            </View>
            <Text className="text-white text-4xl font-bold">Bloom&apos;a Giriş Yap</Text>
            <Text className="text-zinc-300 mt-3 text-center text-base">Üniversite mailinle güvenli şekilde giriş yap.</Text>
          </View>

          <View className="bg-zinc-950/85 border border-zinc-700 rounded-3xl p-5">
            <AuthInput
              label="Üniversite e-postası"
              placeholder="ornek@uni.edu.tr"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
            />

            <AuthInput
              label="Şifre"
              placeholder="Şifren"
              value={password}
              onChangeText={setPassword}
              secureToggle
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
            />

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              className={`h-14 rounded-xl items-center justify-center flex-row gap-2 ${loading ? 'bg-zinc-700' : 'bg-[#FF5A5F]'}`}
            >
              <Text className="text-white font-bold text-base">{loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="white" />}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-7">
            <Text className="text-zinc-300">Hesabın yok mu? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
              <Text className="text-[#FF5A5F] font-bold">Kaydol</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
