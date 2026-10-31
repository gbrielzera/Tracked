import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { containsProfanity, PROFANITY_MESSAGE } from '@/lib/profanity';
import { useAuthStatus } from '@/stores/auth';
import { colors, fonts, radius, spacing, type } from '@/theme';
import { commentErrorMessage, useCommentQuota, usePostComment } from './interactions';

// Visitantes comentam com limite diário; o banco é quem garante o limite.
export function CommentComposer({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const isGuest = useAuthStatus() === 'guest';
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState(false);

  const post = usePostComment(reviewId);
  const quota = useCommentQuota();

  const limitReached = !!quota.data && quota.data.used >= quota.data.max;
  const canSend = text.trim().length > 0 && !post.isPending && !limitReached;

  const send = () => {
    if (containsProfanity(text)) {
      setBlocked(true);
      return;
    }
    post.mutate(text, { onSuccess: () => setText('') });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (blocked) setBlocked(false);
          }}
          placeholder={limitReached ? 'Limite de comentários de hoje atingido' : 'Escreva um comentário'}
          placeholderTextColor={colors.fog}
          selectionColor={colors.mustard}
          editable={!limitReached}
          multiline
          maxLength={1000}
          accessibilityLabel="Comentário"
          style={styles.input}
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar comentário"
          style={[styles.send, !canSend && styles.sendDisabled]}
        >
          <Ionicons name="send" size={20} color={colors.ink} />
        </Pressable>
      </View>

      {blocked ? <Text style={styles.error}>{PROFANITY_MESSAGE}</Text> : null}
      {post.isError ? <Text style={styles.error}>{commentErrorMessage(post.error, isGuest)}</Text> : null}

      {isGuest && quota.data ? (
        <View style={styles.guestRow}>
          <Text style={styles.hint}>
            Visitante: {quota.data.used} de {quota.data.max} comentários hoje.
          </Text>
          <Pressable onPress={() => router.push('/upgrade')} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>Criar conta</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.field,
    backgroundColor: colors.sleeve,
    borderWidth: 1.5,
    borderColor: colors.groove,
    color: colors.paper,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  error: { ...type.small, color: colors.danger },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { ...type.small, color: colors.fog },
  link: { ...type.small, fontFamily: fonts.bold, color: colors.teal },
});
