import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Equalizer } from '@/components/Equalizer';
import { Screen } from '@/components/Screen';
import { authErrorMessage } from '@/features/auth/errors';
import { supabase } from '@/services/supabase/client';
import { colors, spacing, type } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueAsGuest = async () => {
    setError(null);
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (signInError) setError(authErrorMessage(signInError));
  };

  return (
    <Screen scroll={false} style={styles.content}>
      <View style={styles.hero}>
        <Equalizer />
        <Text style={styles.wordmark}>Tracked</Text>
        <Text style={styles.tagline}>Anote o que você ouve. Dê nota a cada faixa, álbum e artista.</Text>
      </View>

      <View style={styles.actions}>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label="Entrar" onPress={() => router.push('/login')} />
        <Button label="Criar conta" variant="secondary" onPress={() => router.push('/signup')} />
        <Button label="Continuar como visitante" variant="ghost" loading={busy} onPress={continueAsGuest} />
        <Text style={styles.note}>Visitantes navegam e comentam. Para avaliar, crie uma conta.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between', paddingBottom: spacing.lg },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.md },
  wordmark: { ...type.display, color: colors.paper },
  tagline: { ...type.subtitle, color: colors.fog, maxWidth: 320 },
  actions: { gap: spacing.sm },
  note: { ...type.small, color: colors.fog, textAlign: 'center', marginTop: spacing.xs },
  error: { ...type.small, color: colors.danger, textAlign: 'center' },
});
