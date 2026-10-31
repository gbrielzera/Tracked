import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { StarRating } from '@/components/StarRating';
import { containsProfanity, PROFANITY_MESSAGE } from '@/lib/profanity';
import type { MediaItem } from '@/services/music';
import { useAuth } from '@/stores/auth';
import { colors, fonts, radius, spacing, type } from '@/theme';
import { useDeleteReview, useSaveReview } from './queries';

type Existing = { id: string; rating: number; body: string | null } | null;

const PLACEHOLDERS = {
  track: 'O que você achou dessa música?',
  album: 'O que você achou desse álbum?',
  artist: 'O que você acha desse artista?',
} as const;

export function ReviewForm({ item, existing }: { item: MediaItem; existing: Existing }) {
  const privateReviews = useAuth((s) => s.profile?.reviews_private ?? false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useSaveReview(item);
  const remove = useDeleteReview();

  // Quando a review salva chega do servidor, o formulário passa a refletir esse valor.
  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setBody(existing?.body ?? '');
  }, [existing?.id, existing?.rating, existing?.body]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const flash = (message: string) => {
    setNotice(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3000);
  };

  const unchanged = !!existing && existing.rating === rating && (existing.body ?? '') === body.trim();
  const canSave = rating > 0 && !unchanged && !save.isPending;

  const onSave = () => {
    if (containsProfanity(body)) {
      setBlocked(true);
      return;
    }
    save.mutate({ rating, body }, { onSuccess: () => flash(existing ? 'Review atualizada.' : 'Review publicada.') });
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert('Excluir review', 'A nota e o texto serão apagados. Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => remove.mutate(existing.id, { onSuccess: () => flash('Review excluída.') }),
      },
    ]);
  };

  const failed = save.isError || remove.isError;

  return (
    <View style={styles.form}>
      <StarRating value={rating} onChange={setRating} size={40} showValue />
      <TextInput
        value={body}
        onChangeText={(value) => {
          setBody(value);
          if (blocked) setBlocked(false);
        }}
        placeholder={PLACEHOLDERS[item.kind]}
        placeholderTextColor={colors.fog}
        selectionColor={colors.mustard}
        multiline
        maxLength={5000}
        textAlignVertical="top"
        accessibilityLabel="Texto da review"
        style={styles.input}
      />
      {body.length >= 4500 ? <Text style={styles.counter}>{body.length} de 5000 caracteres</Text> : null}

      {privateReviews ? (
        <Text style={styles.hint}>Suas reviews estão privadas: só você vê esta. Mude isso no perfil.</Text>
      ) : null}
      {blocked ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {PROFANITY_MESSAGE}
        </Text>
      ) : null}
      {failed ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          Não foi possível salvar. Verifique sua conexão e tente de novo.
        </Text>
      ) : null}
      {notice ? (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}

      <Button
        label={existing ? 'Atualizar review' : 'Publicar review'}
        onPress={onSave}
        loading={save.isPending}
        disabled={!canSave}
      />
      {existing ? <Button label="Excluir review" variant="ghost" onPress={onDelete} loading={remove.isPending} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  input: {
    minHeight: 120,
    padding: 14,
    borderRadius: radius.field,
    backgroundColor: colors.sleeve,
    borderWidth: 1.5,
    borderColor: colors.groove,
    color: colors.paper,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  counter: { ...type.small, color: colors.fog, textAlign: 'right' },
  hint: { ...type.small, color: colors.fog },
  error: { ...type.small, color: colors.danger },
  notice: { ...type.small, color: colors.teal },
});
