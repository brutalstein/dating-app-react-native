import "../global.css"; 
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import api, { sanitizeToken } from '@/api/config';
import { ExploreHubProvider } from '@/store/exploreHub/context';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        const token = sanitizeToken(storedToken);

        const currentRoot = String(segments[0] || '');
        const inAuthGroup = segments[0] === '(auth)';
        const inOnboarding = currentRoot === 'onboarding';

        if (!token) {
          if (storedToken) {
            await SecureStore.deleteItemAsync('token');
          }

          if (inOnboarding || !inAuthGroup) {
            router.replace('/(auth)/login' as any);
          }
          return;
        }

        const response = await api.get('/auth/profile');
        const onboardingCompleted = Boolean(response?.data?.onboardingCompleted);

        if (!onboardingCompleted && !inOnboarding) {
          router.replace('/onboarding' as any);
          return;
        }

        if (onboardingCompleted && (inAuthGroup || inOnboarding)) {
          router.replace('/(tabs)' as any);
          return;
        }

        if (!onboardingCompleted && inAuthGroup) {
          router.replace('/onboarding' as any);
          return;
        }
      } catch (error: any) {
        const status = error?.response?.status;
        const isAuthFailure = status === 400 || status === 401;

        if (isAuthFailure) {
          await SecureStore.deleteItemAsync('token');
        } else {
          console.error('Auth check error:', error);
        }

        const currentRoot = String(segments[0] || '');
        const inAuthGroup = segments[0] === '(auth)';
        const inOnboarding = currentRoot === 'onboarding';

        if (isAuthFailure) {
          if (inOnboarding || !inAuthGroup) {
            router.replace('/(auth)/login' as any);
          }
          return;
        }

        if (!inAuthGroup && !inOnboarding) {
          router.replace('/(auth)/login' as any);
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, segments]);

  if (isCheckingAuth) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ExploreHubProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/verify" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="messages" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="activity" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="proactive-preferences" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="premium-purchase" options={{ headerShown: false, animation: 'slide_from_right' }} />
        </Stack>
      </ExploreHubProvider>
    </SafeAreaProvider>
  );
}
