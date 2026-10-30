import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MediaRow } from '@/components/MediaRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useSearch } from '@/features/music/queries';
import { useUserSearch } from '@/features/search/queries';
import type { MediaItem } from '@/services/music';
import { colors, fonts, radius } from '@/theme';

type Segment = 'track' | 'album' | 'artist' | 'user';

const SEGMENTS = [
  { key: 'track' as const, label: 'Músicas' },
  { key: 'album' as const, label: 'Álbuns' },
  { key: 'artist' as const, label: 'Artistas' },
  { key: 'user' as const, label: 'Pessoas' },
];

type Row = {
  key: string;
  title: string;
  subtitle: string | null;
  cover: string | null;
  round: boolean;
  href: string;
};

function rowFor(item: MediaItem): Row {
  switch (item.kind) {
    case 'track':
      return { key: item.id, title: item.title, subtitle: item.artist.name, cover: item.album?.cover?.sm ?? null, round: false, href: `/track/${item.id}` };
    case 'album':
      return { key: item.id, title: item.title, subtitle: item.artist.name, cover: item.cover?.sm ?? null, round: false, href: `/album/${item.id}` };
    case 'artist':
      return { key: item.id, title: item.name, subtitle: null, cover: item.image?.sm ?? null, round: true, href: `/artist/${item.id}` };
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  // A consulta só muda quando o usuário envia: poupa a cota do Deezer.
  const [submitted, setSubmitted] = useState('');
  const [segment, setSegment] = useState<Segment>('track');

  const media = useSearch(segment === 'user' ? 'track' : segment, segment === 'user' ? '' : submitted);
  const users = useUserSearch(segment === 'user' ? submitted : '');

  const submit = () => {
    const value = text.trim();
    if (value.length >= 2) setSubmitted(value);
  };

  const rows = useMemo<Row[]>(() => {
    if (segment === 'user') {
      return (users.data ?? []).map((u) => ({
        key: u.id, title: u.displayName, subtitle: `@${u.username}`, cover: u.avatarUrl, round: true, href: `/user/${u.username}`,
      }));
    }
    return (media.data?.pages ?? []).flatMap((page) => page.items).map(rowFor);
  }, [segment, users.data, media.data]);

  const active = segment === 'user' ? users : media;
  const searched = submitted.length >= 2;

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <View style={styles.inputBox}>
          <Ionicons name="search" size={20} color={colors.fog} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
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
            <Pressable onPress={() => setText('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={20} color={colors.fog} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={submit} accessibilityRole="button" style={styles.searchButton}>
          <Text style={styles.searchButtonLabel}>Buscar</Text>
        </Pressable>
      </View>

      <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />

      {!searched ? (
        <EmptyState
          title="O que você quer avaliar?"
          body="Digite pelo menos 2 letras e toque em Buscar."
        />
      ) : active.isFetching && rows.length === 0 ? (
        <LoadingState />
      ) : active.isError ? (
        <ErrorState
          error={active.error}
          message={segment === 'user' ? 'Não foi possível buscar pessoas. Tente de novo.' : undefined}
          onRetry={() => void active.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState title="Nada encontrado" body={`Nenhum resultado para "${submitted}". Tente outro nome.`} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (segment !== 'user' && media.hasNextPage && !media.isFetchingNextPage) void media.fetchNextPage();
          }}
          ListFooterComponent={
            segment !== 'user' && media.isFetchingNextPage ? (
              <ActivityIndicator color={colors.mustard} style={styles.footer} />
            ) : undefined
          }
          renderItem={({ item }) => (
            <MediaRow
              title={item.title}
              subtitle={item.subtitle}
              coverUri={item.cover}
              round={item.round}
              onPress={() => router.push(item.href as never)}
            />
          )}
        />
      )}
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
  searchButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  list: { paddingBottom: 24 },
  footer: { paddingVertical: 16 },
});
