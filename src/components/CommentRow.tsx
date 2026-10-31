import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import type { Comment } from '@/features/reviews/interactions';
import { formatRelative } from '@/lib/format';
import { colors, fonts, spacing, type } from '@/theme';

type Props = {
  comment: Comment;
  canDelete: boolean;
  canReport: boolean;
  onDelete: () => void;
  onReport: () => void;
};

export function CommentRow({ comment, canDelete, canReport, onDelete, onReport }: Props) {
  const router = useRouter();
  const openProfile = () => {
    if (comment.authorUsername) router.push(`/user/${comment.authorUsername}`);
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={openProfile} disabled={!comment.authorUsername} accessibilityRole="button">
        <Avatar uri={comment.authorAvatarUrl} name={comment.authorDisplayName} size={36} />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {comment.authorDisplayName}
          </Text>
          <Text style={styles.meta}>{formatRelative(comment.createdAt)}</Text>
        </View>
        <Text style={styles.body}>{comment.body}</Text>
        {canDelete || canReport ? (
          <View style={styles.actions}>
            {canDelete ? (
              <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button">
                <Text style={styles.action}>Excluir</Text>
              </Pressable>
            ) : null}
            {canReport ? (
              <Pressable onPress={onReport} hitSlop={8} accessibilityRole="button">
                <Text style={styles.action}>Denunciar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: spacing.sm },
  content: { flex: 1, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper, flexShrink: 1 },
  meta: { ...type.small, color: colors.fog },
  body: { ...type.body, color: colors.paper },
  actions: { flexDirection: 'row', gap: spacing.md, paddingTop: 2 },
  action: { ...type.small, fontFamily: fonts.medium, color: colors.fog },
});
