import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MediaCover } from '@/components/MediaCover';
import { FavoriteKind, MAX_FAVORITES, useFavorites } from '@/features/profile/favorites';
import { colors, fonts, spacing, type } from '@/theme';

const COPY: Record<FavoriteKind, { title: string; add: string; editRoute: string }> = {
  artist: { title: 'Top 5 artistas', add: 'Adicionar artista favorito', editRoute: '/settings/favorites' },
  track: { title: 'Músicas do momento', add: 'Adicionar música do momento', editRoute: '/settings/favorite-tracks' },
};

type Props = { kind: FavoriteKind; userId: string | undefined; isOwn: boolean };

// Lista empilhada (uma linha por posição) dos 5 artistas ou das 5 músicas do perfil.
// No próprio perfil, as vagas vazias aparecem como linhas tracejadas que levam ao editor.
export function FavoriteSection({ kind, userId, isOwn }: Props) {
  const router = useRouter();
  const copy = COPY[kind];
  const query = useFavorites(kind, userId);
  const entries = query.data ?? [];

  if (query.isPending) return null;
  if (!isOwn && entries.length === 0) return null;

  const slots = isOwn ? Array.from({ length: MAX_FAVORITES }, (_, index) => entries[index] ?? null) : entries;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.heading} accessibilityRole="header">
          {copy.title}
        </Text>
        {isOwn ? (
          <Pressable onPress={() => router.push(copy.editRoute as never)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.edit}>Editar</Text>
          </Pressable>
        ) : null}
      </View>

      {query.isError ? <Text style={styles.muted}>Não foi possível carregar esta lista.</Text> : null}

      <View style={styles.list}>
        {slots.map((entry, index) => {
          const position = (
            <Text style={[styles.position, index === 0 && styles.first]}>{index + 1}</Text>
          );

          if (!entry) {
            return (
              <Pressable
                key={`empty-${index}`}
                onPress={() => router.push(copy.editRoute as never)}
                accessibilityRole="button"
                accessibilityLabel={`${copy.add}, posição ${index + 1}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                {position}
                <View style={[styles.emptyCover, kind === 'artist' && styles.round]}>
                  <Ionicons name="add" size={22} color={colors.fog} />
                </View>
                <Text style={styles.emptyLabel}>{copy.add}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={entry.externalId}
              onPress={() => router.push(`/${kind}/${entry.externalId}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}º: ${entry.name}${entry.subtitle ? `, ${entry.subtitle}` : ''}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              {position}
              <MediaCover uri={entry.imageUrl} size={48} round={kind === 'artist'} />
              <View style={styles.texts}>
                <Text style={styles.name} numberOfLines={1}>
                  {entry.name}
                </Text>
                {entry.subtitle ? (
                  <Text style={styles.sub} numberOfLines={1}>
                    {entry.subtitle}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.fog} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const COVER = 48;

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.paper },
  edit: { fontFamily: fonts.bold, fontSize: 14, color: colors.teal },
  muted: { ...type.small, color: colors.fog },
  // Linhas separadas por um fio, como uma lista de verdade.
  list: { borderTopWidth: 1, borderTopColor: colors.groove },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.groove,
  },
  pressed: { backgroundColor: colors.sleeve },
  position: { fontFamily: fonts.extra, fontSize: 18, color: colors.fog, width: 22, textAlign: 'center' },
  first: { color: colors.mustard },
  texts: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  sub: { ...type.small, color: colors.fog },
  emptyCover: {
    width: COVER,
    height: COVER,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.groove,
    alignItems: 'center',
    justifyContent: 'center',
  },
  round: { borderRadius: COVER / 2 },
  emptyLabel: { flex: 1, ...type.body, color: colors.fog },
});
