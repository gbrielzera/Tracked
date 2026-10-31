import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MediaRow } from '@/components/MediaRow';
import { PullRefresh } from '@/components/PullRefresh';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useSearch } from '@/features/music/queries';
import { useSearchHistory } from '@/features/search/history';
import { useUserSearch } from '@/features/search/queries';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useRefresh } from '@/lib/useRefresh';
import type { MediaItem } from '@/services/music';
import { colors, fonts, radius, spacing } from '@/theme';

type Kind = 'track' | 'album' | 'artist' | 'user';
type Segment = 'all' | Kind;

const SEGMENTS = [
  { key: 'all' as const, label: 'Tudo' },
  { key: 'track' as const, label: 'Músicas' },
  { key: 'album' as const, label: 'Álbuns' },
  { key: 'artist' as const, label: 'Artistas' },
  { key: 'user' as const, label: 'Pessoas' },
];

const TITLES: Record<Kind, string> = { track: 'Músicas', album: 'Álbuns', artist: 'Artistas', user: 'Pessoas' };
const KINDS: Kind[] = ['track', 'album', 'artist', 'user'];

// Na aba "Tudo" cada seção mostra só os primeiros; "Ver todos" abre o filtro.
const PREVIEW = 4;
const DEBOUNCE_MS = 400;

type Row = {
  key: string;
  title: string;
  subtitle: string | null;
  cover: string | null;
  round: boolean;
  href: string;
};

type ListItem =
  | { type: 'header'; key: string; kind: Kind; showAll: boolean }
  | { type: 'row'; key: string; row: Row };

function rowFor(item: MediaItem): Row {
  switch (item.kind) {
    case 'track':
      return { key: `track-${item.id}`, title: item.title, subtitle: item.artist.name, cover: item.album?.cover?.sm ?? null, round: false, href: `/track/${item.id}` };
    case 'album':
      return { key: `album-${item.id}`, title: item.title, subtitle: item.artist.name, cover: item.cover?.sm ?? null, round: false, href: `/album/${item.id}` };
    case 'artist':
      return { key: `artist-${item.id}`, title: item.name, subtitle: null, cover: item.image?.sm ?? null, round: true, href: `/artist/${item.id}` };
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  // O texto que de fato busca: acompanha a digitação (com pausa) ou o Enter, que não espera.
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(text.trim(), DEBOUNCE_MS);
  useEffect(() => setQuery(debounced), [debounced]);

  // O toque no filtro acende o botão na hora; a lista troca logo depois, sem travar o toque.
  const [segment, setSegment] = useState<Segment>('all');
  const shown = useDeferredValue(segment);

  const history = useSearchHistory();
  const searched = query.length >= 2;
  const want = (kind: Kind) => (searched && (shown === 'all' || shown === kind) ? query : '');

  const tracks = useSearch('track', want('track'));
  const albums = useSearch('album', want('album'));
  const artists = useSearch('artist', want('artist'));
  const users = useUserSearch(want('user'));

  const rowsByKind = useMemo<Record<Kind, Row[]>>(() => {
    const media = (q: { data?: { pages: { items: MediaItem[] }[] } }) =>
      (q.data?.pages ?? []).flatMap((page) => page.items).map(rowFor);
    return {
      track: media(tracks),
      album: media(albums),
      artist: media(artists),
      user: (users.data ?? []).map((u) => ({
        key: `user-${u.id}`, title: u.displayName, subtitle: `@${u.username}`, cover: u.avatarUrl, round: true, href: `/user/${u.username}`,
      })),
    };
  }, [tracks.data, albums.data, artists.data, users.data]);

  const queryByKind = { track: tracks, album: albums, artist: artists, user: users };
  const active = (shown === 'all' ? KINDS : [shown]).map((kind) => queryByKind[kind]);

  const items = useMemo<ListItem[]>(() => {
    if (shown !== 'all') return rowsByKind[shown].map((row) => ({ type: 'row', key: row.key, row }));
    return KINDS.flatMap((kind): ListItem[] => {
      const rows = rowsByKind[kind];
      if (rows.length === 0) return [];
      return [
        { type: 'header', key: `header-${kind}`, kind, showAll: rows.length > PREVIEW },
        ...rows.slice(0, PREVIEW).map((row): ListItem => ({ type: 'row', key: row.key, row })),
      ];
    });
  }, [shown, rowsByKind]);

  const refresh = useRefresh(() => Promise.all(active.map((q) => q.refetch())));

  const loading = searched && items.length === 0 && active.some((q) => q.isFetching);
  const allFailed = searched && active.every((q) => q.isError);
  const someFailed = searched && !allFailed && active.some((q) => q.isError);

  const single = shown !== 'all' ? shown : null;
  const singleQuery = single && single !== 'user' ? queryByKind[single] : null;

  let body: React.ReactNode;
  if (!searched) {
    body =
      history.items.length === 0 ? (
        <EmptyState title="O que você quer avaliar?" body="Digite pelo menos 2 letras. Os resultados aparecem enquanto você escreve." />
      ) : (
        <FlatList
          data={history.items}
          keyExtractor={(term) => term}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerTitle} accessibilityRole="header">
                Buscas recentes
              </Text>
              <Pressable onPress={history.clear} hitSlop={10} accessibilityRole="button">
                <Text style={styles.headerLink}>Limpar tudo</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: term }) => (
            <View style={styles.historyRow}>
              <Pressable
                onPress={() => {
                  setText(term);
                  setQuery(term);
                  history.add(term);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Buscar ${term} de novo`}
                style={styles.historyMain}
              >
                <Ionicons name="time-outline" size={20} color={colors.fog} />
                <Text style={styles.historyText} numberOfLines={1}>
                  {term}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => history.remove(term)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${term} do histórico`}
                style={styles.historyRemove}
              >
                <Ionicons name="close" size={20} color={colors.fog} />
              </Pressable>
            </View>
          )}
        />
      );
  } else if (loading) {
    body = <LoadingState />;
  } else if (allFailed) {
    body = (
      <ErrorState
        error={active.find((q) => q.isError)?.error}
        message={shown === 'user' ? 'Não foi possível buscar pessoas. Tente de novo.' : undefined}
        onRetry={() => void refresh.onRefresh()}
      />
    );
  } else if (items.length === 0) {
    body = <EmptyState title="Nada encontrado" body={`Nenhum resultado para "${query}". Tente outro nome.`} />;
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        windowSize={7}
        refreshControl={<PullRefresh refreshing={refresh.refreshing} onRefresh={() => void refresh.onRefresh()} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (singleQuery?.hasNextPage && !singleQuery.isFetchingNextPage) void singleQuery.fetchNextPage();
        }}
        ListFooterComponent={
          singleQuery?.isFetchingNextPage ? (
            <ActivityIndicator color={colors.mustard} style={styles.footer} />
          ) : someFailed ? (
            <Text style={styles.partial}>Algumas buscas falharam. Puxe para baixo para tentar de novo.</Text>
          ) : undefined
        }
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View style={styles.header}>
              <Text style={styles.headerTitle} accessibilityRole="header">
                {TITLES[item.kind]}
              </Text>
              {item.showAll ? (
                <Pressable onPress={() => setSegment(item.kind)} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.headerLink}>Ver todos</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <MediaRow
              title={item.row.title}
              subtitle={item.row.subtitle}
              coverUri={item.row.cover}
              round={item.row.round}
              onPress={() => {
                history.add(query);
                router.push(item.row.href as never);
              }}
            />
          )
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <View style={styles.inputBox}>
          <Ionicons name="search" size={20} color={colors.fog} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => {
              setQuery(text.trim());
              history.add(text);
              Keyboard.dismiss();
            }}
            placeholder="Músicas, álbuns, artistas ou pessoas"
            placeholderTextColor={colors.fog}
            selectionColor={colors.mustard}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar"
            style={styles.input}
          />
          {text.length > 0 ? (
            <Pressable
              onPress={() => {
                setText('');
                setQuery('');
              }}
              hitSlop={12} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={20} color={colors.fog} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />

      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 8, gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
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
  list: { paddingBottom: 24 },
  footer: { paddingVertical: 16 },
  partial: { fontFamily: fonts.regular, fontSize: 14, color: colors.fog, textAlign: 'center', padding: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.paper },
  headerLink: { fontFamily: fonts.bold, fontSize: 14, color: colors.teal },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8 },
  historyMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  historyText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.paper },
  historyRemove: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
