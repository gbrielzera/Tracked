import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { MediaCover } from '@/components/MediaCover';
import { MediaRow } from '@/components/MediaRow';
import { Screen } from '@/components/Screen';
import {
  FavoriteEntry,
  MAX_FAVORITES,
  useFavoriteArtists,
  useSaveFavorites,
  useSuggestedArtists,
} from '@/features/profile/favorites';
import { useSearch } from '@/features/music/queries';
import type { Artist } from '@/services/music';
import { useAuth } from '@/stores/auth';
import { colors, fonts, radius, spacing, type } from '@/theme';

function IconButton({
  name,
  label,
  onPress,
  disabled,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.iconButton, disabled && styles.iconDisabled]}
    >
      <Ionicons name={name} size={22} color={colors.paper} />
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const userId = useAuth((s) => s.session?.user.id);

  const saved = useFavoriteArtists(userId);
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');

  // Carrega o Top 5 salvo uma única vez.
  useEffect(() => {
    if (saved.data && !loaded) {
      setEntries(saved.data);
      setLoaded(true);
    }
  }, [saved.data, loaded]);

  const full = entries.length >= MAX_FAVORITES;
  const has = (externalId: string) => entries.some((e) => e.externalId === externalId);

  const search = useSearch('artist', submitted);
  const suggestions = useSuggestedArtists(!full && loaded);
  const save = useSaveFavorites(userId);

  const add = (entry: FavoriteEntry) => {
    if (full || has(entry.externalId)) return;
    setEntries((current) => [...current, entry]);
  };
  const addArtist = (artist: Artist) =>
    add({ externalId: artist.id, name: artist.name, imageUrl: artist.image?.md ?? null, artist });
  const remove = (index: number) => setEntries((current) => current.filter((_, i) => i !== index));
  const move = (index: number, delta: -1 | 1) =>
    setEntries((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      const moved = next[index];
      next[index] = next[target];
      next[target] = moved;
      return next;
    });

  const submitSearch = () => {
    const value = text.trim();
    if (value.length >= 2) setSubmitted(value);
  };

  const onSave = () => save.mutate(entries, { onSuccess: () => router.back() });

  const results = (search.data?.pages.flatMap((page) => page.items) ?? [])
    .filter((item): item is Artist => item.kind === 'artist')
    .slice(0, 10);
  const suggested = (suggestions.data ?? []).filter((s) => !has(s.externalId));

  if (saved.isPending) {
    return (
      <Screen scroll={false} edges={['bottom']} style={styles.center}>
        <ActivityIndicator color={colors.mustard} size="large" />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Text style={styles.title}>Seus 5 artistas favoritos</Text>
      <Text style={styles.body}>A ordem importa: o primeiro aparece em destaque no seu perfil.</Text>

      <View style={styles.list}>
        {entries.length === 0 ? <Text style={styles.empty}>Nenhum artista escolhido ainda.</Text> : null}
        {entries.map((entry, index) => (
          <View key={entry.externalId} style={styles.entry}>
            <Text style={styles.position}>{index + 1}</Text>
            <MediaCover uri={entry.imageUrl} size={44} round />
            <Text style={styles.entryName} numberOfLines={1}>
              {entry.name}
            </Text>
            <IconButton name="arrow-up" label={`Subir ${entry.name}`} disabled={index === 0} onPress={() => move(index, -1)} />
            <IconButton
              name="arrow-down"
              label={`Descer ${entry.name}`}
              disabled={index === entries.length - 1}
              onPress={() => move(index, 1)}
            />
            <IconButton name="close" label={`Remover ${entry.name}`} onPress={() => remove(index)} />
          </View>
        ))}
      </View>

      {!full ? (
        <View style={styles.add}>
          <Text style={styles.heading}>Adicionar artista</Text>

          {suggested.length > 0 && submitted.length === 0 ? (
            <View style={styles.chips}>
              <Text style={styles.hint}>Mais bem avaliados por você</Text>
              {suggested.map((s) => (
                <Pressable
                  key={s.externalId}
                  onPress={() => add({ externalId: s.externalId, name: s.name, imageUrl: null })}
                  accessibilityRole="button"
                  style={styles.chip}
                >
                  <Ionicons name="add" size={18} color={colors.teal} />
                  <Text style={styles.chipLabel}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.searchRow}>
            <View style={styles.inputBox}>
              <Ionicons name="search" size={20} color={colors.fog} />
              <TextInput
                value={text}
                onChangeText={setText}
                onSubmitEditing={submitSearch}
                placeholder="Buscar artista"
                placeholderTextColor={colors.fog}
                selectionColor={colors.mustard}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Buscar artista"
                style={styles.input}
              />
            </View>
            <Pressable onPress={submitSearch} accessibilityRole="button" style={styles.searchButton}>
              <Text style={styles.searchLabel}>Buscar</Text>
            </Pressable>
          </View>

          {search.isFetching && results.length === 0 ? (
            <ActivityIndicator color={colors.mustard} style={styles.loading} />
          ) : null}
          {search.isError ? <Text style={styles.error}>Não foi possível buscar. Tente de novo.</Text> : null}
          <View style={styles.results}>
            {results.map((artist) => (
              <MediaRow
                key={artist.id}
                title={artist.name}
                coverUri={artist.image?.sm ?? null}
                round
                trailing={
                  has(artist.id) ? (
                    <Ionicons name="checkmark" size={22} color={colors.teal} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color={colors.paper} />
                  )
                }
                onPress={() => addArtist(artist)}
              />
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>Você escolheu 5 artistas. Remova um para adicionar outro.</Text>
      )}

      {save.isError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          Não foi possível salvar. Verifique sua conexão e tente de novo.
        </Text>
      ) : null}
      <Button label="Salvar Top 5" loading={save.isPending} onPress={onSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  title: { ...type.title, color: colors.paper },
  body: { ...type.body, color: colors.fog },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  empty: { ...type.body, color: colors.fog },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.sm,
    borderRadius: radius.field,
    backgroundColor: colors.sleeve,
  },
  position: { fontFamily: fonts.extra, fontSize: 18, color: colors.fog, width: 20, textAlign: 'center' },
  entryName: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconDisabled: { opacity: 0.3 },
  add: { gap: spacing.md, marginTop: spacing.md },
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.paper },
  hint: { ...type.small, color: colors.fog },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.groove,
  },
  chipLabel: { ...type.small, fontFamily: fonts.medium, color: colors.paper },
  searchRow: { flexDirection: 'row', gap: 8 },
  inputBox: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.field,
    backgroundColor: colors.sleeve,
    borderWidth: 1.5,
    borderColor: colors.groove,
  },
  input: { flex: 1, color: colors.paper, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 10 },
  searchButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  loading: { paddingVertical: spacing.md },
  results: { marginHorizontal: -spacing.lg },
  error: { ...type.small, color: colors.danger },
});
