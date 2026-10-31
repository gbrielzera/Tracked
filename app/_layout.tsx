import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
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
import { usePushNotifications } from '@/features/notifications/push';
import { useNotificationsRealtime } from '@/features/notifications/queries';
import { queryClient } from '@/lib/queryClient';
import { useAuthStatus } from '@/stores/auth';
import { colors, fonts } from '@/theme';

void SplashScreen.preventAutoHideAsync();

// Sem isso, telas sem fundo próprio (ex.: feed vazio) ficam claras e o texto claro some.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.paper,
    border: colors.groove,
    primary: colors.mustard,
    notification: colors.mustard,
  },
};

// Telas de detalhe: cabeçalho discreto só com o botão de voltar.
const detailOptions = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.paper,
  headerBackButtonDisplayMode: 'minimal',
} as const;

// Mesma base, com título visível.
const titledOptions = (title: string) =>
  ({ ...detailOptions, title, headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18 } }) as const;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  useAuthBootstrap();
  useNotificationsRealtime();
  usePushNotifications();
  const status = useAuthStatus();

  const ready = (fontsLoaded || !!fontError) && status !== 'loading';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return (
    <ThemeProvider value={navigationTheme}>
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
          <Stack.Screen name="review/[id]" options={titledOptions('Review')} />
          <Stack.Screen name="user/[username]/index" options={detailOptions} />
          <Stack.Screen name="user/[username]/followers" options={titledOptions('Seguidores')} />
          <Stack.Screen name="user/[username]/following" options={titledOptions('Seguindo')} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="notifications" options={titledOptions('Notificações')} />
          <Stack.Screen name="settings/edit-profile" options={titledOptions('Editar perfil')} />
          <Stack.Screen name="settings/favorites" options={titledOptions('Artistas favoritos')} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'guest'}>
          <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/reset-password" />
      </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
