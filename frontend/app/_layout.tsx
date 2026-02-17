import "../global.css";
import { Stack, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import api, { sanitizeToken } from '@/api/config';
import { ExploreHubProvider } from '@/store/exploreHub/context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initMonitoring } from '@/services/monitoring';
import { setAuthSnapshot, subscribeAuthSession } from '@/services/authSession';

export default function RootLayout() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    initMonitoring();
  }, []);

  useEffect(() => {
    return subscribeAuthSession((snapshot) => {
      if (snapshot.ready && !snapshot.authenticated) {
        router.replace('/(auth)/login' as any);
      }
    });
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        const token = sanitizeToken(storedToken);

        if (!token) {
          if (storedToken) {
            await SecureStore.deleteItemAsync('token');
          }

          setAuthSnapshot({ ready: true, authenticated: false });
          router.replace('/(auth)/login' as any);
          return;
        }

        const response = await api.get('/auth/profile');
        const onboardingCompleted = Boolean(response?.data?.onboardingCompleted);

        setAuthSnapshot({ ready: true, authenticated: true });

        if (!onboardingCompleted) {
          router.replace('/onboarding' as any);
        }
      } catch (error: any) {
        const status = error?.response?.status;
        const isAuthFailure = status === 400 || status === 401 || status === 403;

        if (isAuthFailure) {
          await SecureStore.deleteItemAsync('token');
          setAuthSnapshot({ ready: true, authenticated: false });
          router.replace('/(auth)/login' as any);
        } else {
          console.error('Auth check error:', error);
          setAuthSnapshot({ ready: true, authenticated: false });
          router.replace('/(auth)/login' as any);
        }
      } finally {
        setAuthSnapshot({ ready: true });
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

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
          <Stack.Screen name="admin/moderation" options={{ headerShown: false, animation: 'slide_from_right' }} />
        </Stack>
      </ExploreHubProvider>
    </SafeAreaProvider>
  );
}
