import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import BloomLogo from '@/components/ui/bloom-logo';

const { height } = Dimensions.get('window');

function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = ((params.email as string) || '').trim().toLowerCase();

  const [code, setCode] = useState<string[]>(new Array(6).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const formOpacity = useSharedValue(0);
  const shakeAnimation = useSharedValue(0);

  useEffect(() => {
    formOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    const focusTimer = setTimeout(() => inputRefs.current[0]?.focus(), 500);
    return () => clearTimeout(focusTimer);
  }, [formOpacity]);

  useEffect(() => {
    if (!email) {
      Alert.alert('E-posta Eksik', 'Doğrulama için e-posta bulunamadı. Lütfen tekrar kayıt ol.');
      router.replace('/(auth)/register' as any);
    }
  }, [email, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    setCanResend(true);
  }, [countdown]);

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateX: shakeAnimation.value }],
  }));

  const maskedEmail = email ? `${email.slice(0, 3)}***${email.slice(email.indexOf('@'))}` : '';

  const handleCodeChange = (text: string, index: number) => {
    setHasError(false);
    const sanitizedText = text.replace(/\D/g, '');

    if (sanitizedText.length > 1) {
      const pastedCode = sanitizedText.slice(0, 6).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);

      const lastFilledIndex = Math.min(index + pastedCode.length - 1, 5);
      if (newCode.every((c) => c !== '')) {
        Keyboard.dismiss();
        handleVerify(newCode.join(''));
      } else {
        inputRefs.current[lastFilledIndex + 1]?.focus();
        setFocusedIndex(lastFilledIndex + 1);
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = sanitizedText;
    setCode(newCode);

    if (sanitizedText && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    if (newCode.every((c) => c !== '')) {
      Keyboard.dismiss();
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  const handleVerify = async (verificationCode: string) => {
    if (!email) {
      Alert.alert('E-posta Eksik', 'Doğrulama için e-posta bulunamadı.');
      return;
    }

    setIsVerifying(true);
    setHasError(false);

    try {
      await authService.verifyOtp(email, verificationCode);

      Alert.alert('Doğrulama Başarılı', 'E-posta adresin başarıyla doğrulandı.');

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
      triggerError();
      Alert.alert('Doğrulama Başarısız', error?.message || 'Doğrulama kodu geçersiz.');
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerError = () => {
    setHasError(true);
    setIsVerifying(false);
    shakeAnimation.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleResend = async () => {
    if (!canResend) return;

    if (!email) {
      Alert.alert('E-posta Eksik', 'Doğrulama için e-posta bulunamadı.');
      return;
    }

    try {
      await authService.resendOtp(email);

      setCanResend(false);
      setCountdown(60);
      setCode(new Array(6).fill(''));
      setHasError(false);
      inputRefs.current[0]?.focus();
      setFocusedIndex(0);
      Alert.alert('Kod Gönderildi', 'Yeni doğrulama kodu e-posta adresine gönderildi.');
    } catch (error: any) {
      Alert.alert('Yeniden Gönderim Başarısız', error?.message || 'Doğrulama kodu gönderilemedi.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCodeComplete = code.every((c) => c !== '');

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
      <View className="flex-1 bg-black">
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', width: '100%', height }}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0} className="flex-1">
          <ScrollView
            className="px-6"
            contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 24 }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 bg-zinc-900/80 rounded-2xl items-center justify-center mb-8">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View className="items-center mb-10">
              <BloomLogo size="lg" showStatusDot />
              <Text className="text-white text-3xl font-bold mb-3 mt-5">E-posta Doğrulama</Text>
              <Text className="text-zinc-300 text-center text-base mb-1">6 haneli kodu gönderdik</Text>
              <Text className="text-white font-semibold text-base">{maskedEmail}</Text>
            </View>

            <Animated.View style={formStyle} className="items-center mb-6">
              <View className="flex-row gap-3 mb-6">
                {code.map((digit, index) => (
                  <View
                    key={index}
                    className="w-14 h-16 bg-zinc-900/90 rounded-2xl border-2 overflow-hidden"
                    style={{
                      borderColor: hasError ? '#EF4444' : focusedIndex === index ? '#FF5A5F' : digit ? '#FF5A5F80' : '#3F3F46',
                    }}
                  >
                    <TextInput
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      className="flex-1 text-white text-2xl font-bold text-center"
                      style={{ color: hasError ? '#EF4444' : 'white' }}
                      value={digit}
                      onChangeText={(text) => handleCodeChange(text, index)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                      onFocus={() => setFocusedIndex(index)}
                      keyboardType="number-pad"
                      maxLength={Platform.OS === 'ios' ? 6 : 1}
                      selectTextOnFocus
                      caretHidden
                    />
                  </View>
                ))}
              </View>

              {hasError && <Text className="text-red-500 text-sm mb-4 text-center">Geçersiz doğrulama kodu. Lütfen tekrar deneyin.</Text>}

              <View className="items-center mb-6">
                {canResend ? (
                  <TouchableOpacity onPress={handleResend}>
                    <Text className="text-zinc-300 text-base">
                      Kod gelmedi mi? <Text className="text-[#FF5A5F] font-bold underline">Yeniden Gönder</Text>
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text className="text-zinc-400 text-base">
                    Yeniden gönder: <Text className="text-white font-semibold">{formatTime(countdown)}</Text>
                  </Text>
                )}
              </View>
            </Animated.View>

            <View className="flex-1 justify-end pb-2">
              <TouchableOpacity
                onPress={() => handleVerify(code.join(''))}
                disabled={!isCodeComplete || isVerifying}
                className={`h-14 rounded-xl items-center justify-center flex-row gap-2 ${isCodeComplete ? 'bg-[#FF5A5F]' : 'bg-zinc-700'}`}
              >
                {isVerifying ? (
                  <Text className="text-white font-bold text-lg">Doğrulanıyor...</Text>
                ) : (
                  <>
                    <Text className="text-white font-bold text-lg">Doğrula</Text>
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.back()} className="flex-row items-center justify-center mt-5 gap-2">
                <Ionicons name="pencil" size={16} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm">Email adresini değiştir</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

export default VerifyEmailScreen;
