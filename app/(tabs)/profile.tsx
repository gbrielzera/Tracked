import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { GuestGate } from '@/components/GuestGate';
import { Screen } from '@/components/Screen';
import { supabase } from '@/services/supabase/client';
import { useAuth, useAuthStatus } from '@/stores/auth';
import { colors, spacing, type } from '@/theme';

// Resumo provisório do perfil; a tela completa entra na F5.
export default function ProfileScreen() {
  const status = useAuthStatus();
  const profile = useAuth((s) => s.profile);

  if (status === 'guest') {
    return (
      <GuestGate
        title="Seu perfil fica aqui"
        body="Crie uma conta para ter perfil, avaliar músicas e escolher seus 5 artistas favoritos."
      />
    );
  }

  return (
    <Screen edges={[]}>
      <View style={styles.header}>
        <Avatar uri={profile?.avatar_url} name={profile?.display_name} size={72} />
        <View style={styles.names}>
          <Text style={styles.name}>{profile?.display_name}</Text>
          <Text style={styles.handle}>@{profile?.username}</Text>
        </View>
      </View>
      <Button label="Sair" variant="secondary" onPress={() => void supabase.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  names: { flex: 1, gap: 2 },
  name: { ...type.title, color: colors.paper },
  handle: { ...type.body, color: colors.fog },
});
