import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MusicLoader } from '@/components/MusicLoader';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { MediaCover } from '@/components/MediaCover';
import { MediaRow } from '@/components/MediaRow';
import { Screen } from '@/components/Screen';
import { ErrorState } from '@/components/states';
import { useSearch } from '@/features/music/queries';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { Artist, MediaItem, Track } from '@/services/music';
import { useAuth } from '@/stores/auth';
import { colors, fonts, radius, spacing, type } from '@/theme';
import {
  FavoriteEntry,
  FavoriteKind,
  MAX_FAVORITES,
  useFavorites,
  useSaveFavorites,
  useSuggestedFavorites,
} from './favorites';

// Textos de cada lista; o resto da tela é igual para artistas e músicas.
const COPY: Record<FavoriteKind, {
  title: string;
  body: string;
  empty: string;
  addHeading: string;
  placeholder: string;
  full: string;
  save: string;
  loadError: string;
}> = {
  artist: {
    title: 'Seus 5 artistas favoritos',
    body: 'A ordem importa: o primeiro aparece em destaque no seu perfil.',
    empty: 'Nenhum artista escolhido ainda.',
    addHeading: 'Adicionar artista',
    placeholder: 'Buscar artista',
    full: 'Você escolheu 5 artistas. Remova um para adicionar outro.',
    save: 'Salvar Top 5',
    loadError: 'Não foi possível carregar seus artistas favoritos.',
  },
  track: {
    title: 'Suas 5 músicas do momento',
    body: 'O que você não para de ouvir agora. A primeira aparece em destaque no seu perfil.',
    empty: 'Nenhuma música escolhida ainda.',
    addHeading: 'Adicionar música',
    placeholder: 'Buscar música',
    full: 'Você escolheu 5 músicas. Remova uma para adicionar outra.',
    save: 'Salvar músicas',
    loadError: 'Não foi possível carregar suas músicas do momento.',
  },
};

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

function entryFromArtist(artist: Artist): FavoriteEntry {
  return { externalId: artist.id, name: artist.name, imageUrl: artist.image?.md ?? null, item: artist };
}

function entryFromTrack(track: Track): FavoriteEntry {
  return {
    externalId: track.id,
    name: track.title,
    subtitle: track.artist.name,
    imageUrl: track.album?.cover?.md ?? null,
    item: track,
  };
}

// Editor dos dois "Top 5" do perfil: escolher, reordenar, remover e salvar.
export function FavoritesEditor({ kind }: { kind: FavoriteKind }) {
  const copy = COPY[kind];
  const round = kind === 'artist';
  const router = useRouter();
  const userId = useAuth((s) => s.session?.user.id);

  const saved = useFavorites(kind, userId);
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  // A lista de cima ocupa a tela: ao tocar na busca, rola até ela para o teclado não esconder os resultados.
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const addY = useRef(0);
  const scrollToSearch = () =>
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(addY.current - 8, 0), animated: true }), 250);

  const [text, setText] = useState('');
  // A busca acompanha a digitação (com uma pausa, para poupar a cota do Deezer); o Enter não espera.
  const [submitted, setSubmitted] = useState('');
  const debounced = useDebouncedValue(text.trim(), 400);
  useEffect(() => setSubmitted(debounced), [debounced]);

  // Carrega a lista salva uma única vez.
  useEffect(() => {
    if (saved.data && !loaded) {
      setEntries(saved.data);
      setLoaded(true);
    }
  }, [saved.data, loaded]);

  const full = entries.length >= MAX_FAVORITES;
  const has = (externalId: string) => entries.some((e) => e.externalId === externalId);

  const search = useSearch(kind, submitted);
  const suggestions = useSuggestedFavorites(kind, !full && loaded);
  const save = useSaveFavorites(kind, userId);

  const add = (entry: FavoriteEntry) => {
    if (full || has(entry.externalId)) return;
    setEntries((current) => [...current, entry]);
  };
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

  const submitSearch = () => setSubmitted(text.trim());

  const onSave = () => save.mutate(entries, { onSuccess: () => router.back() });

  const results = (search.data?.pages.flatMap((page) => page.items) ?? [])
    .filter((item): item is Artist | Track => item.kind === kind)
    .slice(0, 10);
  const suggested = (suggestions.data ?? []).filter((s) => !has(s.externalId));

  // Quando os primeiros resultados aparecem, leva a tela até eles (o conteúdo só cresce agora).
  const hadResults = useRef(false);
  useEffect(() => {
    if (results.length > 0 && !hadResults.current) scrollToSearch();
    hadResults.current = results.length > 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length]);

  // Sem carregar a lista salva, não dá para editar: salvar uma lista vazia apagaria os favoritos.
  if (saved.isError) {
    return <ErrorState error={saved.error} message={copy.loadError} onRetry={() => void saved.refetch()} />;
  }

  if (saved.isPending) {
    return (
      <Screen scroll={false} edges={['bottom']} style={styles.center}>
        <MusicLoader />
      </Screen>
    );
  }

  const resultRow = (item: MediaItem) => {
    const entry = item.kind === 'artist' ? entryFromArtist(item) : item.kind === 'track' ? entryFromTrack(item) : null;
    if (!entry) return null;
    return (
      <MediaRow
        key={entry.externalId}
        title={entry.name}
        subtitle={entry.subtitle ?? null}
        coverUri={item.kind === 'track' ? (item.album?.cover?.sm ?? null) : item.kind === 'artist' ? (item.image?.sm ?? null) : null}
        round={round}
        trailing={
          has(entry.externalId) ? (
            <Ionicons name="checkmark" size={22} color={colors.teal} />
          ) : (
            <Ionicons name="add-circle-outline" size={24} color={colors.paper} />
          )
        }
        onPress={() => add(entry)}
      />
    );
  };

  return (
    <Screen edges={['bottom']} scrollRef={scrollRef}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      <View style={styles.list}>
        {entries.length === 0 ? <Text style={styles.empty}>{copy.empty}</Text> : null}
        {entries.map((entry, index) => (
          <View key={entry.externalId} style={styles.entry}>
            <Text style={styles.position}>{index + 1}</Text>
            <MediaCover uri={entry.imageUrl} size={44} round={round} />
            <View style={styles.entryText}>
              <Text style={styles.entryName} numberOfLines={1}>
                {entry.name}
              </Text>
              {entry.subtitle ? (
                <Text style={styles.entrySub} numberOfLines={1}>
                  {entry.subtitle}
                </Text>
              ) : null}
            </View>
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
        <View style={styles.add} onLayout={(event) => (addY.current = event.nativeEvent.layout.y)}>
          <Text style={styles.heading}>{copy.addHeading}</Text>

          {suggested.length > 0 && submitted.length === 0 ? (
            <View style={styles.chips}>
              <Text style={styles.hint}>Mais bem avaliados por você</Text>
              {suggested.map((s) => (
                <Pressable
                  key={s.externalId}
                  onPress={() =>
                    add({ externalId: s.externalId, name: s.name, subtitle: s.subtitle ?? null, imageUrl: s.imageUrl ?? null })
                  }
                  accessibilityRole="button"
                  style={styles.chip}
                >
                  <Ionicons name="add" size={18} color={colors.teal} />
                  <Text style={styles.chipLabel}>{s.subtitle ? `${s.name} · ${s.subtitle}` : s.name}</Text>
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
                onFocus={scrollToSearch}
                onSubmitEditing={submitSearch}
                placeholder={copy.placeholder}
                placeholderTextColor={colors.fog}
                selectionColor={colors.mustard}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={copy.placeholder}
                style={styles.input}
              />
            </View>
          </View>

          {search.isFetching && results.length === 0 ? (
            <MusicLoader compact style={styles.loading} />
          ) : null}
          {search.isError ? <Text style={styles.error}>Não foi possível buscar. Tente de novo.</Text> : null}
          <View style={styles.results}>{results.map(resultRow)}</View>
        </View>
      ) : (
        <Text style={styles.hint}>{copy.full}</Text>
      )}

      {save.isError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          Não foi possível salvar. Verifique sua conexão e tente de novo.
        </Text>
      ) : null}
      <Button label={copy.save} loading={save.isPending} onPress={onSave} />
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
  entryText: { flex: 1 },
  entryName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  entrySub: { ...type.small, color: colors.fog },
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
  loading: { paddingVertical: spacing.md },
  results: { marginHorizontal: -spacing.lg },
  error: { ...type.small, color: colors.danger },
});
