import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';

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
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    if (!normalizedEmail.endsWith('.edu.tr')) {
      Alert.alert('Validation Error', 'Only .edu.tr university email addresses are accepted.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password
      });

      Alert.alert('Registration Successful', response.message || 'Please verify your email to activate your account.');
      router.push(`/(auth)/verify?email=${encodeURIComponent(normalizedEmail)}` as any);
    } catch (error: any) {
      Alert.alert('Registration Failed', error?.message || 'We could not complete your registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 pt-20">
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-zinc-900 rounded-3xl items-center justify-center mb-4">
            <Ionicons name="flame" size={40} color="#FF5A5F" />
          </View>
          <Text className="text-white text-3xl font-bold">Bloom&#39;a Katıl</Text>
          <Text className="text-zinc-500 mt-2 text-center">Sadece üniversitelilere özel topluluğa adım at.</Text>
        </View>

        <View className="bg-zinc-900 p-6 rounded-3xl shadow-xl">
          {/* First and last name side by side */}
          <View className="flex-row gap-2 mb-4">
            <TextInput 
              placeholder="Ad" 
              placeholderTextColor="#666" 
              className="flex-1 bg-zinc-800 text-white h-14 px-4 rounded-xl border border-zinc-700"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput 
              placeholder="Soyad" 
              placeholderTextColor="#666" 
              className="flex-1 bg-zinc-800 text-white h-14 px-4 rounded-xl border border-zinc-700"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          {/* Email */}
          <TextInput 
            placeholder="Üniversite Maili (.edu.tr)" 
            placeholderTextColor="#666" 
            autoCapitalize="none"
            keyboardType="email-address"
            className="bg-zinc-800 text-white h-14 px-4 rounded-xl border border-zinc-700 mb-4"
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <View className="bg-zinc-800 h-14 px-4 rounded-xl border border-zinc-700 mb-4 flex-row items-center">
            <TextInput 
              placeholder="Şifre" 
              placeholderTextColor="#666" 
              secureTextEntry={!showPassword}
              className="flex-1 text-white"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput 
            placeholder="Şifreyi Onayla" 
            placeholderTextColor="#666" 
            secureTextEntry={!showPassword}
            className="bg-zinc-800 text-white h-14 px-4 rounded-xl border border-zinc-700 mb-6"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity 
            onPress={handleRegister}
            disabled={loading}
            className={`h-14 rounded-xl items-center justify-center flex-row gap-2 ${loading ? 'bg-zinc-700' : 'bg-[#FF5A5F]'}`}
          >
            <Text className="text-white font-bold text-lg">{loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}</Text>
            {!loading && <Ionicons name="arrow-forward" size={20} color="white" />}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-zinc-500 text-base">Zaten üye misin? </Text>
          <TouchableOpacity onPress={() => router.navigate('/(auth)/login' as any)}>
            <Text className="text-[#FF5A5F] font-bold text-base">Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}