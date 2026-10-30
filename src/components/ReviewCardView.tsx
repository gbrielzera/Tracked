import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import type { ReviewCard } from '@/features/reviews/queries';
import { formatRelative } from '@/lib/format';
import { colors, fonts, spacing, type } from '@/theme';

export function ReviewCardView({ review }: { review: ReviewCard }) {
  const router = useRouter();
  const openProfile = () => {
    if (review.authorUsername) router.push(`/user/${review.authorUsername}`);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={openProfile} style={styles.header} accessibilityRole="button">
        <Avatar uri={review.authorAvatarUrl} name={review.authorDisplayName} size={40} />
        <View style={styles.names}>
          <Text style={styles.name} numberOfLines={1}>
            {review.authorDisplayName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {review.authorUsername ? `@${review.authorUsername}` : 'Visitante'}
          </Text>
        </View>
        <Text style={styles.meta}>{formatRelative(review.createdAt)}</Text>
      </Pressable>
      <StarRating value={review.rating} size={18} />
      {review.body ? <Text style={styles.body}>{review.body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.groove },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  names: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper },
  meta: { ...type.small, color: colors.fog },
  body: { ...type.body, color: colors.paper },
});
