import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Attribution, DetailHero, DetailLayout, Facts, SectionHeading } from '@/components/DetailLayout';
import { MediaRow } from '@/components/MediaRow';
import { ErrorState, LoadingState } from '@/components/states';
import { DescriptionBlock } from '@/features/music/DescriptionBlock';
import { useArtist, useArtistAlbums, useArtistTopTracks } from '@/features/music/queries';
import { RatingSummary } from '@/features/reviews/RatingSummary';
import { ReviewSection } from '@/features/reviews/ReviewSection';
import { formatCount, formatDuration } from '@/lib/format';
import type { Album } from '@/services/music';
import { colors, spacing, type } from '@/theme';

const RECORD_TYPES: Record<string, string> = { album: 'Álbum', single: 'Single', ep: 'EP', compile: 'Coletânea' };

function albumSubtitle(album: Album) {
  const kind = RECORD_TYPES[album.recordType ?? ''] ?? 'Álbum';
  const year = album.releaseDate?.slice(0, 4);
  return year ? `${kind} de ${year}` : kind;
}

export default function ArtistScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const artistQuery = useArtist(id);
  const artist = artistQuery.data;
  const top = useArtistTopTracks(id);
  const albums = useArtistAlbums(artist ? { id: artist.id, name: artist.name } : undefined);

  if (artistQuery.isPending) return <LoadingState />;
  if (artistQuery.isError) return <ErrorState error={artistQuery.error} onRetry={() => void artistQuery.refetch()} />;

  const albumItems = albums.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <DetailLayout>
      <DetailHero coverUri={artist!.image?.xl} round title={artist!.name}>
        <Facts
          items={[
            { label: 'Fãs', value: formatCount(artist!.fans) },
            { label: 'Álbuns', value: artist!.albumCount ? String(artist!.albumCount) : null },
          ]}
        />
      </DetailHero>

      <RatingSummary kind="artist" externalId={artist!.id} />
      <DescriptionBlock item={artist!} />

      {top.data && top.data.length > 0 ? (
        <View style={styles.list}>
          <View style={styles.listHeading}>
            <SectionHeading>Músicas mais ouvidas</SectionHeading>
          </View>
          {top.data.map((track) => (
            <MediaRow
              key={track.id}
              title={track.title}
              subtitle={track.album?.title}
              coverUri={track.album?.cover?.sm ?? null}
              trailing={<Text style={styles.duration}>{formatDuration(track.durationSec)}</Text>}
              onPress={() => router.push(`/track/${track.id}`)}
            />
          ))}
        </View>
      ) : null}

      {albumItems.length > 0 ? (
        <View style={styles.list}>
          <View style={styles.listHeading}>
            <SectionHeading>Álbuns</SectionHeading>
          </View>
          {albumItems.map((album) => (
            <MediaRow
              key={album.id}
              title={album.title}
              subtitle={albumSubtitle(album)}
              coverUri={album.cover?.sm ?? null}
              onPress={() => router.push(`/album/${album.id}`)}
            />
          ))}
          {albums.hasNextPage ? (
            <View style={styles.more}>
              <Button
                label="Ver mais álbuns"
                variant="secondary"
                loading={albums.isFetchingNextPage}
                onPress={() => void albums.fetchNextPage()}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <ReviewSection item={artist!} />
      <Attribution>Catálogo: Deezer</Attribution>
    </DetailLayout>
  );
}

// As listas ocupam a largura toda: compensam o padding da tela.
const styles = StyleSheet.create({
  list: { marginHorizontal: -spacing.lg },
  listHeading: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  more: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  duration: { ...type.small, color: colors.fog },
});
