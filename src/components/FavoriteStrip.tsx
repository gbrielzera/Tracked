import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MediaCover } from '@/components/MediaCover';
import { MAX_FAVORITES, type FavoriteEntry } from '@/features/profile/favorites';
import { colors, fonts, type } from '@/theme';

type Props = { entries: FavoriteEntry[]; editable?: boolean; onEdit?: () => void };

const SIZE = 56;

// Os 5 artistas favoritos. No próprio perfil, vagas vazias levam ao editor.
export function FavoriteStrip({ entries, editable = false, onEdit }: Props) {
  const router = useRouter();
  const slots = Array.from({ length: MAX_FAVORITES }, (_, index) => entries[index] ?? null);

  if (!editable && entries.length === 0) return null;

  return (
    <View style={styles.row}>
      {slots.map((entry, index) => {
        if (entry) {
          return (
            <Pressable
              key={entry.externalId}
              onPress={() => router.push(`/artist/${entry.externalId}`)}
              accessibilityRole="button"
              accessibilityLabel={entry.name}
              style={styles.slot}
            >
              <MediaCover uri={entry.imageUrl} size={SIZE} round />
              <Text style={styles.name} numberOfLines={1}>
                {entry.name}
              </Text>
            </Pressable>
          );
        }
        if (!editable) return <View key={`empty-${index}`} style={styles.slot} />;
        return (
          <Pressable
            key={`empty-${index}`}
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Adicionar artista favorito"
            style={styles.slot}
          >
            <View style={styles.empty}>
              <Ionicons name="add" size={24} color={colors.fog} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  slot: { flex: 1, alignItems: 'center', gap: 6 },
  name: { ...type.small, fontFamily: fonts.medium, color: colors.paper, textAlign: 'center' },
  empty: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.groove,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
