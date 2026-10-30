import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Attribution, DetailHero, DetailLayout, Facts, LinkText, SectionHeading } from '@/components/DetailLayout';
import { MediaRow, RankNumber } from '@/components/MediaRow';
import { ErrorState, LoadingState } from '@/components/states';
import { DescriptionBlock } from '@/features/music/DescriptionBlock';
import { useAlbum } from '@/features/music/queries';
import { RatingSummary } from '@/features/reviews/RatingSummary';
import { ReviewSection } from '@/features/reviews/ReviewSection';
import { formatDate, formatDuration } from '@/lib/format';
import { colors, spacing, type } from '@/theme';

export default function AlbumScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { data: album, isPending, isError, error, refetch } = useAlbum(id);

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <DetailLayout>
      <DetailHero coverUri={album.cover?.xl} title={album.title}>
        <LinkText onPress={() => router.push(`/artist/${album.artist.id}`)}>{album.artist.name}</LinkText>
        <Facts
          items={[
            { label: 'Lançamento', value: formatDate(album.releaseDate) },
            { label: 'Faixas', value: album.trackCount ? String(album.trackCount) : null },
            { label: 'Duração', value: formatDuration(album.durationSec) },
            { label: 'Gêneros', value: album.genres.join(', ') },
            { label: 'Gravadora', value: album.label },
          ]}
        />
      </DetailHero>

      <RatingSummary kind="album" externalId={album.id} />
      <DescriptionBlock item={album} />

      {album.tracks && album.tracks.length > 0 ? (
        <View style={styles.tracklist}>
          <View style={styles.tracklistHeading}>
            <SectionHeading>Faixas</SectionHeading>
          </View>
          {album.tracks.map((track, index) => (
            <MediaRow
              key={track.id}
              title={track.title}
              leading={<RankNumber value={index + 1} />}
              trailing={<Text style={styles.duration}>{formatDuration(track.durationSec)}</Text>}
              onPress={() => router.push(`/track/${track.id}`)}
            />
          ))}
        </View>
      ) : null}

      <ReviewSection item={album} />
      <Attribution>Catálogo: Deezer</Attribution>
    </DetailLayout>
  );
}

// A lista ocupa a largura toda: compensa o padding da tela.
const styles = StyleSheet.create({
  tracklist: { marginHorizontal: -spacing.lg },
  tracklistHeading: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  duration: { ...type.small, color: colors.fog },
});
