import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { MusicLoader } from '@/components/MusicLoader';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { authErrorMessage } from '@/features/auth/errors';
import { exchangeCodeOnce } from '@/features/auth/exchange';
import { colors, type } from '@/theme';

// Destino de tracked://auth/callback: confirmação de e-mail e retorno do Google.
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code, error_description: errorDescription } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof code !== 'string') {
        if (active) setMessage(errorDescription ? String(errorDescription) : 'Link inválido ou expirado.');
        return;
      }
      const { error } = await exchangeCodeOnce(code);
      if (!active) return;
      if (error) setMessage(authErrorMessage(error));
      else router.replace('/');
    })();
    return () => {
      active = false;
    };
  }, [code, errorDescription, router]);

  return (
    <Screen scroll={false} style={styles.center}>
      {message ? (
        <>
          <Text style={styles.text}>{message}</Text>
          <Button label="Voltar ao início" onPress={() => router.replace('/')} />
        </>
      ) : (
        <>
          <MusicLoader />
          <Text style={styles.text}>Entrando...</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'stretch' },
  text: { ...type.body, color: colors.paper, textAlign: 'center' },
});
