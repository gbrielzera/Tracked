import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { useAuthBootstrap } from '@/features/auth/bootstrap';
import { queryClient } from '@/lib/queryClient';
import { useAuthStatus } from '@/stores/auth';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

// Telas de detalhe: cabeçalho discreto só com o botão de voltar.
const detailOptions = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.paper,
  headerBackButtonDisplayMode: 'minimal',
} as const;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  useAuthBootstrap();
  const status = useAuthStatus();

  const ready = (fontsLoaded || !!fontError) && status !== 'loading';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={status === 'loading' || status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'needsOnboarding'}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'guest' || status === 'ready'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="track/[id]" options={detailOptions} />
          <Stack.Screen name="album/[id]" options={detailOptions} />
          <Stack.Screen name="artist/[id]" options={detailOptions} />
          <Stack.Screen name="user/[username]" options={detailOptions} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'guest'}>
          <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/reset-password" />
      </Stack>
    </QueryClientProvider>
  );
}
