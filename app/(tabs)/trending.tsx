import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MediaRow, RankNumber } from '@/components/MediaRow';
import { PullRefresh } from '@/components/PullRefresh';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useChart } from '@/features/music/queries';
import { RankingList, useRankings } from '@/features/rankings/queries';
import { formatRating } from '@/lib/format';
import { colors, fonts, type } from '@/theme';

type Mode = 'hot' | 'top';
type HotKind = 'track' | 'album' | 'artist';

type Row = {
  key: string;
  rank: number;
  title: string;
  subtitle: string | null;
  cover: string | null;
  round: boolean;
  href: string;
  trailing?: React.ReactNode;
};

const MODES = [
  { key: 'hot' as const, label: 'Em alta' },
  { key: 'top' as const, label: 'Mais bem avaliados' },
];

const HOT_KINDS = [
  { key: 'track' as const, label: 'Músicas' },
  { key: 'album' as const, label: 'Álbuns' },
  { key: 'artist' as const, label: 'Artistas' },
];

const TOP_LISTS = [
  { key: 'track' as const, label: 'Músicas' },
  { key: 'album' as const, label: 'Álbuns' },
  { key: 'artist' as const, label: 'Artistas' },
  { key: 'discography' as const, label: 'Discografia' },
];

export default function TrendingScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('hot');
  const [hotKind, setHotKind] = useState<HotKind>('track');
  const [topList, setTopList] = useState<RankingList>('track');

  const chart = useChart(50);
  const rankings = useRankings(topList, mode === 'top');
  const query = mode === 'hot' ? chart : rankings;

  const rows = useMemo<Row[]>(() => {
    if (mode === 'hot') {
      const data = chart.data;
      if (!data) return [];
      if (hotKind === 'track') {
        return data.tracks.map((t, i) => ({
          key: t.id, rank: i + 1, title: t.title, subtitle: t.artist.name,
          cover: t.album?.cover?.sm ?? null, round: false, href: `/track/${t.id}`,
        }));
      }
      if (hotKind === 'album') {
        return data.albums.map((a, i) => ({
          key: a.id, rank: i + 1, title: a.title, subtitle: a.artist.name,
          cover: a.cover?.sm ?? null, round: false, href: `/album/${a.id}`,
        }));
      }
      return data.artists.map((a, i) => ({
        key: a.id, rank: i + 1, title: a.name, subtitle: null,
        cover: a.image?.sm ?? null, round: true, href: `/artist/${a.id}`,
      }));
    }

    return (rankings.data ?? []).map((r) => {
      const isArtistLike = topList === 'artist' || topList === 'discography';
      const route = topList === 'discography' ? 'artist' : topList;
      return {
        key: r.key,
        rank: r.position,
        title: r.title,
        subtitle: topList === 'discography' ? 'Média das faixas e álbuns' : r.artistName,
        cover: r.coverUrl,
        round: isArtistLike,
        href: `/${route}/${r.externalId}`,
        trailing: (
          <View style={styles.score}>
            <View style={styles.scoreLine}>
              <Ionicons name="star" size={14} color={colors.star} />
              <Text style={styles.scoreValue}>{formatRating(r.avgRating)}</Text>
            </View>
            <Text style={styles.scoreVotes}>{r.votes} avaliações</Text>
          </View>
        ),
      };
    });
  }, [mode, hotKind, topList, chart.data, rankings.data]);

  const emptyTop = mode === 'top' && rankings.isSuccess && rows.length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
        {mode === 'hot' ? (
          <SegmentedControl options={HOT_KINDS} value={hotKind} onChange={setHotKind} />
        ) : (
          <SegmentedControl options={TOP_LISTS} value={topList} onChange={setTopList} />
        )}
      </View>

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : emptyTop ? (
        <EmptyState
          title="Ainda não há avaliações suficientes"
          body="Um item entra neste ranking com pelo menos 2 avaliações. Avalie músicas para montar a lista."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          body="A lista veio vazia. Puxe para baixo ou toque abaixo para tentar de novo."
          actionLabel="Tentar de novo"
          onAction={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          refreshControl={
            <PullRefresh refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
          renderItem={({ item }) => (
            <MediaRow
              title={item.title}
              subtitle={item.subtitle}
              coverUri={item.cover}
              round={item.round}
              leading={<RankNumber value={item.rank} />}
              trailing={item.trailing}
              onPress={() => router.push(item.href as never)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { gap: 8, paddingTop: 8, paddingBottom: 8 },
  list: { paddingBottom: 24 },
  score: { alignItems: 'flex-end', gap: 2 },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.paper },
  scoreVotes: { ...type.small, color: colors.fog },
});
