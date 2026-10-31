import { useLocalSearchParams, useRouter } from 'expo-router';
import { Attribution, DetailHero, DetailLayout, Facts, LinkText } from '@/components/DetailLayout';
import { ErrorState, LoadingState } from '@/components/states';
import { DescriptionBlock } from '@/features/music/DescriptionBlock';
import { useTrack } from '@/features/music/queries';
import { useRefreshItem } from '@/features/reviews/refresh';
import { RatingSummary } from '@/features/reviews/RatingSummary';
import { ReviewSection } from '@/features/reviews/ReviewSection';
import { formatDate, formatDuration } from '@/lib/format';

export default function TrackScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { data: track, isPending, isError, error, refetch } = useTrack(id);
  const refresh = useRefreshItem('track', id, refetch);

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <DetailLayout onRefresh={refresh}>
      <DetailHero coverUri={track.album?.cover?.xl} title={track.title}>
        <LinkText onPress={() => router.push(`/artist/${track.artist.id}`)}>{track.artist.name}</LinkText>
        <Facts
          items={[
            { label: 'Álbum', value: track.album?.title },
            { label: 'Lançamento', value: formatDate(track.releaseDate) },
            { label: 'Duração', value: formatDuration(track.durationSec) },
            { label: 'Conteúdo', value: track.explicit ? 'Letra explícita' : null },
          ]}
        />
        {track.album ? (
          <LinkText onPress={() => router.push(`/album/${track.album!.id}`)}>Ver álbum</LinkText>
        ) : null}
      </DetailHero>

      <RatingSummary kind="track" externalId={track.id} />
      <DescriptionBlock item={track} />
      <ReviewSection item={track} />
      <Attribution>Catálogo: Deezer</Attribution>
    </DetailLayout>
  );
}
