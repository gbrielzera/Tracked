import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadCount } from '@/features/notifications/queries';
import { useAuthStatus } from '@/stores/auth';
import { colors, fonts } from '@/theme';

// Sino do cabeçalho com o número de notificações não lidas. Visitantes não têm notificações.
export function NotificationBell() {
  const router = useRouter();
  const isAccount = useAuthStatus() === 'ready';
  const unread = useUnreadCount();

  if (!isAccount) return null;
  const count = unread.data ?? 0;

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notificações, ${count} novas` : 'Notificações'}
      style={styles.button}
    >
      <Ionicons name={count > 0 ? 'notifications' : 'notifications-outline'} size={24} color={colors.paper} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { marginRight: 16, padding: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
});
