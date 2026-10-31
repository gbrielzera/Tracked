import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { colors, fonts, type } from '@/theme';

type Props = { username: string | null; displayName: string; avatarUrl: string | null };

export function PersonRow({ username, displayName, avatarUrl }: Props) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => username && router.push(`/user/${username}`)}
      disabled={!username}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar uri={avatarUrl} name={displayName} size={48} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        {username ? (
          <Text style={styles.handle} numberOfLines={1}>
            @{username}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 16 },
  pressed: { backgroundColor: colors.sleeve },
  texts: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  handle: { ...type.small, color: colors.fog },
});
