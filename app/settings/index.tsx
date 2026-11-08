import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { MusicLoader } from '@/components/MusicLoader';
import { unregisterPush } from '@/features/notifications/push';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/stores/auth';
import { colors, fonts, radius, spacing, type } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Row({
  icon,
  label,
  hint,
  danger,
  busy,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  danger?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  const tint = danger ? colors.danger : colors.paper;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, busy && styles.busy]}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.fog} /> : null}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

// Central da conta: edição do perfil, listas do perfil e a saída (sair e excluir a conta).
export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const username = useAuth((s) => s.profile?.username);
  const [working, setWorking] = useState<'signout' | 'delete' | null>(null);

  // Ao sair, este aparelho deixa de receber os avisos da conta.
  const signOut = async () => {
    setWorking('signout');
    try {
      await unregisterPush();
      await supabase.auth.signOut();
    } catch {
      setWorking(null);
      Alert.alert('Não foi possível sair', 'Verifique a conexão e tente de novo.');
    }
  };
  const confirmSignOut = () =>
    Alert.alert('Sair da conta?', 'Você pode entrar de novo quando quiser.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => void signOut() },
    ]);

  // Apaga a conta de verdade (avatar, reviews, comentários, curtidas): a função do servidor
  // identifica a pessoa pelo login, então só dá para excluir a própria conta.
  const deleteAccount = async () => {
    setWorking('delete');
    try {
      await unregisterPush();
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw error;
      queryClient.clear();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      setWorking(null);
      Alert.alert('Não foi possível excluir', 'Sua conta continua ativa. Verifique a conexão e tente de novo.');
    }
  };
  const confirmDelete = () =>
    Alert.alert(
      'Excluir conta?',
      'Seu perfil, suas reviews, comentários e curtidas serão apagados para sempre. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir conta', style: 'destructive', onPress: () => void deleteAccount() },
      ],
    );

  const busy = working !== null;

  return (
    <Screen edges={['bottom']}>
      {username ? <Text style={styles.handle}>Conectado como @{username}</Text> : null}

      <Section title="Perfil">
        <Row icon="person-outline" label="Editar perfil" hint="Foto, nome, bio, país e privacidade" onPress={() => router.push('/settings/edit-profile')} />
        <Row icon="star-outline" label="Artistas favoritos" onPress={() => router.push('/settings/favorites')} />
        <Row icon="musical-notes-outline" label="Músicas do momento" onPress={() => router.push('/settings/favorite-tracks')} />
      </Section>

      <Section title="Conta">
        <Row icon="log-out-outline" label="Sair da conta" busy={busy} onPress={confirmSignOut} />
        <Row icon="trash-outline" label="Excluir conta" hint="Apaga tudo e não dá para desfazer" danger busy={busy} onPress={confirmDelete} />
      </Section>

      {busy ? <MusicLoader compact style={styles.loader} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  handle: { ...type.body, color: colors.fog },
  section: { gap: spacing.sm },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.fog, textTransform: 'uppercase', letterSpacing: 0.6 },
  group: { borderRadius: radius.field, backgroundColor: colors.sleeve, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  pressed: { backgroundColor: colors.groove },
  busy: { opacity: 0.5 },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 16 },
  rowHint: { ...type.small, color: colors.fog },
  loader: { marginTop: spacing.md },
});
