import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import { LinearGradient } from 'expo-linear-gradient';
const img = require('../../assets/images/pet-lover.gif');

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Validation Error', 'Please enter your email and password.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await authService.login(normalizedEmail, password);
      Alert.alert('Login Successful', response.message || 'You have successfully signed in.');

      try {
        const profile = await profileService.getProfile();
        if (profile.onboardingCompleted) {
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/onboarding' as any);
        }
      } catch {
        router.replace('/(tabs)' as any);
      }
    } catch (error: any) {
      const message = error?.message || 'Login could not be completed. Please try again.';

      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes('not verified') ||
        lowerMessage.includes('pending email verification')
      ) {
        Alert.alert(
          'Email Verification Required',
          message,
          [
            {
              text: 'Verify Now',
              onPress: () => router.push(`/(auth)/verify?email=${encodeURIComponent(normalizedEmail)}` as any),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Login Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Full-screen GIF background */}
      <View style={{ position: 'absolute', width: '100%', height: height, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={img}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          className="opacity-80"
        />
      </View>

      {/* Gradient overlay for subtle dimming */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', width: '100%', height: height }}
      />

      {/* Login form layer above the GIF */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
          <View className="px-6">
            <View className="items-center mb-10">
              <View className="w-24 h-24 bg-zinc-900/90 rounded-3xl items-center justify-center mb-6 border-2 border-zinc-700 shadow-2xl">
                <Ionicons name="flame" size={50} color="#FF5A5F" />
              </View>
              <Text className="text-white text-4xl font-bold">Bloom&apos;a Giriş Yap</Text>
              <Text className="text-zinc-300 mt-3 text-center text-base">Üniversite maili ile giriş yapın.</Text>
            </View>

            <View className="bg-zinc-900/90 p-6 rounded-3xl shadow-2xl border border-zinc-700/50">
              {/* Email */}
              <TextInput
                placeholder="Üniversite Maili (.edu.tr)"
                placeholderTextColor="#888"
                autoCapitalize="none"
                keyboardType="email-address"
                className="bg-zinc-800/80 text-white h-14 px-4 rounded-xl border border-zinc-600 mb-4"
                value={email}
                onChangeText={setEmail}
              />

              {/* Password */}
              <View className="bg-zinc-800/80 h-14 px-4 rounded-xl border border-zinc-600 mb-6 flex-row items-center">
                <TextInput
                  placeholder="Şifre"
                  placeholderTextColor="#888"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#888" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className={`h-14 rounded-xl items-center justify-center flex-row gap-2 ${loading ? 'bg-zinc-700' : 'bg-[#FF5A5F]'} shadow-lg`}
              >
                <Text className="text-white font-bold text-lg">{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</Text>
                {!loading && <Ionicons name="arrow-forward" size={22} color="white" />}
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-center mt-8">
              <Text className="text-zinc-300 text-base">Hesabınız yok mu? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text className="text-[#FF5A5F] font-bold text-base">Kaydol</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}