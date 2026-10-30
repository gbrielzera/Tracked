import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { supabase } from '@/services/supabase/client';
import { colors, spacing, type } from '@/theme';

type Props = { title: string; body: string };

// Convite exibido a visitantes nas áreas que exigem conta.
export function GuestGate({ title, body }: Props) {
  const router = useRouter();
  return (
    <Screen scroll={false} edges={['bottom']} style={styles.center}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <View style={styles.actions}>
        <Button label="Criar conta" onPress={() => router.push('/upgrade')} />
        <Button label="Já tenho conta" variant="ghost" onPress={() => void supabase.auth.signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  copy: { gap: spacing.sm, marginBottom: spacing.md },
  title: { ...type.title, color: colors.paper },
  body: { ...type.body, color: colors.fog },
  actions: { gap: spacing.sm },
});
