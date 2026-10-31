import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { StarRating } from '@/components/StarRating';
import { useAuth } from '@/stores/auth';
import { colors, radius, spacing, type } from '@/theme';
import { useDeleteReview } from './queries';

type Props = {
  review: { id: string; rating: number; body: string | null };
  onEdit: () => void;
  onDeleted: () => void;
};

// A sua review já publicada: nota, atalho para editar e para excluir.
// O texto aparece na lista "Reviews" logo abaixo, como o das outras pessoas.
export function MyReviewSummary({ review, onEdit, onDeleted }: Props) {
  const privateReviews = useAuth((s) => s.profile?.reviews_private ?? false);
  const remove = useDeleteReview();

  const confirmDelete = () =>
    Alert.alert('Excluir review', 'A nota e o texto serão apagados. Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => remove.mutate(review.id, { onSuccess: onDeleted }) },
    ]);

  return (
    <View style={styles.box}>
      <StarRating value={review.rating} size={32} showValue />
      <Text style={styles.hint}>
        {privateReviews
          ? 'Suas reviews estão privadas: só você vê esta.'
          : 'Sua review aparece na lista abaixo, junto com as das outras pessoas.'}
      </Text>
      {remove.isError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          Não foi possível excluir. Verifique sua conexão e tente de novo.
        </Text>
      ) : null}
      <Button label="Editar review" variant="secondary" icon="create-outline" onPress={onEdit} />
      <Button
        label="Excluir review"
        variant="ghost"
        onPress={confirmDelete}
        loading={remove.isPending}
        // Logo após publicar, o id real ainda está chegando do servidor.
        disabled={!review.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.md, padding: spacing.md, borderRadius: radius.field, backgroundColor: colors.sleeve },
  hint: { ...type.small, color: colors.fog },
  error: { ...type.small, color: colors.danger },
});
