import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStatus } from '@/stores/auth';
import { colors } from '@/theme';

// Engrenagem do cabeçalho do perfil: abre as Configurações (editar perfil, sair, excluir conta).
// Visitantes não têm conta para configurar.
export function SettingsButton() {
  const router = useRouter();
  const isAccount = useAuthStatus() === 'ready';
  if (!isAccount) return null;

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Configurações"
      style={styles.button}
    >
      <Ionicons name="settings-outline" size={24} color={colors.paper} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { marginRight: 16, padding: 2 },
});
