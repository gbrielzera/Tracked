import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReviewCard } from '@/features/reviews/queries';
import { useProfileSummary } from '@/features/social/queries';
import { formatRelative, formatReviewCounts, plural } from '@/lib/format';
import { colors, fonts, radius, spacing, type } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Line({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={18} color={colors.fog} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

type Props = {
  userId: string;
  // A review mais recente da pessoa (a primeira da lista do perfil), se houver.
  lastReview?: ReviewCard;
};

// Atividade do perfil: última review, quanto avaliou de cada tipo e o artista mais avaliado.
// Quem tem reviews privadas não mostra nada disso para os outros (o banco devolve zerado).
export function ProfileActivity({ userId, lastReview }: Props) {
  const router = useRouter();
  const summary = useProfileSummary(userId);
  const counts = summary.data ? formatReviewCounts(summary.data) : null;
  const top = summary.data?.topArtist ?? null;

  if (!lastReview && !counts && !top) return null;

  return (
    <View style={styles.card}>
      {lastReview ? (
        <Line icon="time-outline">
          Última review {formatRelative(lastReview.createdAt)}: <Text style={styles.strong}>{lastReview.mediaTitle}</Text>
        </Line>
      ) : null}
      {counts ? <Line icon="stats-chart-outline">{counts} avaliados</Line> : null}
      {top ? (
        <Pressable
          onPress={() => router.push(`/artist/${top.externalId}`)}
          accessibilityRole="link"
          accessibilityLabel={`Artista mais avaliado: ${top.name}, ${plural(top.reviews, 'avaliação', 'avaliações')}`}
          style={({ pressed }) => [styles.line, pressed && styles.pressed]}
        >
          <Ionicons name="mic-outline" size={18} color={colors.fog} />
          <Text style={styles.text}>
            Mais avaliado: <Text style={styles.strong}>{top.name}</Text> ({plural(top.reviews, 'avaliação', 'avaliações')})
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.fog} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: spacing.md, borderRadius: radius.field, backgroundColor: colors.sleeve },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 },
  pressed: { opacity: 0.7 },
  text: { ...type.small, flex: 1, color: colors.fog },
  strong: { fontFamily: fonts.semibold, color: colors.paper },
});
