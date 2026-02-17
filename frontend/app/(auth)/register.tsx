import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import AuthInput from '@/components/ui/auth-input';
import BloomLogo from '@/components/ui/bloom-logo';

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!firstName.trim() || !lastName.trim() || !normalizedEmail || !password || !confirmPassword) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldur.');
      return;
    }

    if (!normalizedEmail.endsWith('.edu.tr')) {
      Alert.alert('Geçersiz E-posta', 'Sadece .edu.tr uzantılı e-posta kabul edilir.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Şifre Hatası', 'Şifreler uyuşmuyor.');
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
      });

      Alert.alert('Kayıt Alındı', 'Doğrulama kodunu e-postana gönderdik.');
      router.push(`/(auth)/verify?email=${encodeURIComponent(normalizedEmail)}` as any);
    } catch (error: any) {
      Alert.alert('Kayıt Başarısız', error?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-black">
      <ScrollView className="px-6 pt-16" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View className="items-center mb-8">
          <BloomLogo size="lg" withBackground />
          <Text className="text-white text-3xl font-bold mt-5">Hesap Oluştur</Text>
          <Text className="text-zinc-400 mt-2 text-center">Üniversite topluluğuna katılıp bağlantılarını büyüt.</Text>
        </View>

        <View className="bg-zinc-900 p-6 rounded-3xl border border-zinc-700">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <AuthInput label="Ad" placeholder="Adın" value={firstName} onChangeText={setFirstName} autoComplete="name-given" textContentType="givenName" />
            </View>
            <View className="flex-1">
              <AuthInput label="Soyad" placeholder="Soyadın" value={lastName} onChangeText={setLastName} autoComplete="name-family" textContentType="familyName" />
            </View>
          </View>

          <AuthInput
            label="Üniversite e-postası"
            placeholder="ornek@uni.edu.tr"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />

          <AuthInput
            label="Şifre"
            placeholder="Şifre belirle"
            value={password}
            onChangeText={setPassword}
            secureToggle
            textContentType="newPassword"
            autoComplete="password-new"
          />

          <AuthInput
            label="Şifre (Tekrar)"
            placeholder="Şifreni tekrar yaz"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureToggle
            textContentType="newPassword"
            autoComplete="password-new"
          />

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className={`h-14 rounded-xl items-center justify-center flex-row gap-2 ${loading ? 'bg-zinc-700' : 'bg-[#FF5A5F]'}`}
          >
            <Text className="text-white font-bold text-base">{loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}</Text>
            {!loading && <Ionicons name="arrow-forward" size={18} color="white" />}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-7 pb-6">
          <Text className="text-zinc-400">Zaten hesabın var mı? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
            <Text className="text-[#FF5A5F] font-bold">Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
