import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import AuthInput from '@/components/ui/auth-input';
import BloomLogo from '@/components/ui/bloom-logo';

const loginBackgroundGif = require('../../assets/images/pet-lover.gif');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleLogin = useCallback(async () => {
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
  }, [normalizedEmail, password, router]);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
      <View className="flex-1 bg-black">
        <Image source={loginBackgroundGif} className="absolute w-full h-full opacity-80" resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.58)', 'rgba(0,0,0,0.80)']} locations={[0, 0.45, 1]} className="absolute w-full h-full" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0} className="flex-1">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}
            className="px-6"
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center mb-10">
              <BloomLogo size="lg" showStatusDot />
              <Text className="text-white text-4xl font-bold mt-5">Giriş Yap</Text>
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
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <AuthInput
                ref={passwordRef}
                label="Şifre"
                placeholder="Şifren"
                value={password}
                onChangeText={setPassword}
                secureToggle
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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
    </SafeAreaView>
  );
}
