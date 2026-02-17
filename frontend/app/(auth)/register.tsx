import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import AuroraBackground from '@/components/ui/aurora-background';
import BloomBrand from '@/components/ui/bloom-brand';

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <View className="flex-1 bg-black">
      <AuroraBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View className="mb-8">
            <BloomBrand subtitle="Üniversite topluluğuna güvenli giriş." compact />
          </View>

          <View className="bg-black/45 border border-white/15 rounded-3xl p-5">
            <View className="flex-row gap-2 mb-3">
              <TextInput value={firstName} onChangeText={setFirstName} placeholder="Ad" placeholderTextColor="#A1A1AA" className="flex-1 bg-zinc-900/80 text-white h-12 px-4 rounded-xl border border-zinc-700" />
              <TextInput value={lastName} onChangeText={setLastName} placeholder="Soyad" placeholderTextColor="#A1A1AA" className="flex-1 bg-zinc-900/80 text-white h-12 px-4 rounded-xl border border-zinc-700" />
            </View>

            <TextInput value={email} onChangeText={setEmail} placeholder="Üniversite e-postası" placeholderTextColor="#A1A1AA" autoCapitalize="none" className="bg-zinc-900/80 text-white h-12 px-4 rounded-xl border border-zinc-700 mb-3" />

            <View className="bg-zinc-900/80 h-12 px-4 rounded-xl border border-zinc-700 mb-3 flex-row items-center">
              <TextInput value={password} onChangeText={setPassword} placeholder="Şifre" placeholderTextColor="#A1A1AA" secureTextEntry={!showPassword} className="flex-1 text-white" />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#D4D4D8" />
              </TouchableOpacity>
            </View>

            <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Şifre tekrarı" placeholderTextColor="#A1A1AA" secureTextEntry={!showPassword} className="bg-zinc-900/80 text-white h-12 px-4 rounded-xl border border-zinc-700 mb-5" />

            <TouchableOpacity onPress={handleRegister} disabled={loading} className={`h-12 rounded-xl items-center justify-center ${loading ? 'bg-zinc-700' : 'bg-[#F472B6]'}`}>
              <Text className="text-white font-bold">{loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-zinc-300">Zaten hesabın var mı? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text className="text-cyan-300 font-semibold">Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
