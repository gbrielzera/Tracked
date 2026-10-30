import { StyleSheet, Text, View } from 'react-native';
import { StarRating } from '@/components/StarRating';
import { formatRating } from '@/lib/format';
import type { MediaKind } from '@/services/music';
import { colors, fonts, type } from '@/theme';
import { useMediaItemRow } from './queries';

// Nota média da comunidade Tracked (só vem depois da primeira avaliação).
export function RatingSummary({ kind, externalId }: { kind: MediaKind; externalId: string }) {
  const { data } = useMediaItemRow(kind, externalId);

  if (!data || data.ratingsCount === 0 || data.avgRating == null) {
    return <Text style={styles.empty}>Ainda sem avaliações. Seja o primeiro a avaliar.</Text>;
  }

  return (
    <View style={styles.row}>
      <Text style={styles.average}>{formatRating(Number(data.avgRating))}</Text>
      <View style={styles.detail}>
        <StarRating value={Number(data.avgRating)} size={20} />
        <Text style={styles.count}>
          {data.ratingsCount} {data.ratingsCount === 1 ? 'avaliação' : 'avaliações'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  average: { fontFamily: fonts.extra, fontSize: 44, lineHeight: 48, color: colors.paper, letterSpacing: -1 },
  detail: { gap: 4 },
  count: { ...type.small, color: colors.fog },
  empty: { ...type.body, color: colors.fog },
});
