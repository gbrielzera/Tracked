import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { MediaCover } from '@/components/MediaCover';
import { StarRating } from '@/components/StarRating';
import { useToggleLike } from '@/features/reviews/interactions';
import type { ReviewCard } from '@/features/reviews/queries';
import { formatRelative } from '@/lib/format';
import { useAuthStatus } from '@/stores/auth';
import { colors, fonts, spacing, type } from '@/theme';

type Props = {
  review: ReviewCard;
  showAuthor?: boolean;
  showMedia?: boolean;
  // Na tela da própria review não faz sentido abrir a si mesma.
  openable?: boolean;
};

function LikeButton({ review }: { review: ReviewCard }) {
  const router = useRouter();
  const status = useAuthStatus();
  const toggle = useToggleLike();

  const onPress = () => {
    // Visitantes não curtem: convida a criar conta.
    if (status === 'guest') {
      router.push('/upgrade');
      return;
    }
    toggle.mutate({ reviewId: review.id, like: !review.likedByMe });
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: review.likedByMe }}
      accessibilityLabel={review.likedByMe ? 'Remover curtida' : 'Curtir'}
      style={styles.action}
    >
      <Ionicons
        name={review.likedByMe ? 'heart' : 'heart-outline'}
        size={22}
        color={review.likedByMe ? colors.like : colors.fog}
      />
      <Text style={[styles.actionCount, review.likedByMe && { color: colors.like }]}>{review.likesCount}</Text>
    </Pressable>
  );
}

export function ReviewCardView({ review, showAuthor = true, showMedia = false, openable = true }: Props) {
  const router = useRouter();
  const openDetail = () => router.push(`/review/${review.id}`);

  return (
    <View style={styles.card}>
      {showAuthor ? (
        <Pressable
          onPress={() => review.authorUsername && router.push(`/user/${review.authorUsername}`)}
          style={styles.author}
          accessibilityRole="button"
        >
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
      ) : null}

      {showMedia ? (
        <Pressable
          onPress={() => router.push(`/${review.mediaKind}/${review.mediaExternalId}`)}
          style={styles.media}
          accessibilityRole="button"
        >
          <MediaCover uri={review.mediaCoverUrl} size={56} round={review.mediaKind === 'artist'} />
          <View style={styles.names}>
            <Text style={styles.mediaTitle} numberOfLines={2}>
              {review.mediaTitle}
            </Text>
            {review.mediaKind !== 'artist' && review.mediaArtistName ? (
              <Text style={styles.meta} numberOfLines={1}>
                {review.mediaArtistName}
              </Text>
            ) : null}
          </View>
          {!showAuthor ? <Text style={styles.meta}>{formatRelative(review.createdAt)}</Text> : null}
        </Pressable>
      ) : null}

      <Pressable onPress={openDetail} disabled={!openable} style={styles.content}>
        <StarRating value={review.rating} size={18} />
        {review.body ? <Text style={styles.body}>{review.body}</Text> : null}
      </Pressable>

      <View style={styles.actions}>
        <LikeButton review={review} />
        <Pressable
          onPress={openDetail}
          disabled={!openable}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Comentários: ${review.commentsCount}`}
          style={styles.action}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.fog} />
          <Text style={styles.actionCount}>{review.commentsCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.groove },
  author: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  media: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  names: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper },
  mediaTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  meta: { ...type.small, color: colors.fog },
  content: { gap: spacing.sm },
  body: { ...type.body, color: colors.paper },
  actions: { flexDirection: 'row', gap: spacing.lg, paddingTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  actionCount: { ...type.small, color: colors.fog },
});
