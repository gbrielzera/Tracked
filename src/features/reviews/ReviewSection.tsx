import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { ReviewCardView } from '@/components/ReviewCardView';
import type { MediaItem } from '@/services/music';
import { useAuth, useAuthStatus } from '@/stores/auth';
import { colors, radius, spacing, type } from '@/theme';
import { ReviewForm } from './ReviewForm';
import { useItemReviews, useMediaItemRow, useMyReview } from './queries';

// Parte de baixo das telas de detalhe: minha avaliação + reviews das outras pessoas.
export function ReviewSection({ item }: { item: MediaItem }) {
  const router = useRouter();
  const status = useAuthStatus();
  const userId = useAuth((s) => s.session?.user.id);
  const isGuest = status === 'guest';

  const row = useMediaItemRow(item.kind, item.id);
  const mediaItemId = row.data?.id;
  const mine = useMyReview(isGuest ? undefined : mediaItemId);
  const reviews = useItemReviews(mediaItemId);

  // Depois que o formulário apareceu, não o desmonta ao recarregar (perderia o aviso de salvo).
  const formShown = useRef(false);
  const loadingForm = (row.isLoading || mine.isLoading) && !formShown.current;
  if (!isGuest && !loadingForm) formShown.current = true;

  const others = (reviews.data?.pages.flat() ?? []).filter((review) => review.authorId !== userId);

  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        <Text style={styles.heading}>Sua avaliação</Text>
        {isGuest ? (
          <View style={styles.invite}>
            <Text style={styles.inviteText}>
              Crie uma conta para dar nota e escrever sua review. Visitantes podem ler e comentar.
            </Text>
            <Button label="Criar conta" onPress={() => router.push('/upgrade')} />
          </View>
        ) : loadingForm ? (
          <ActivityIndicator color={colors.mustard} style={styles.loading} />
        ) : (
          <ReviewForm item={item} existing={mine.data ?? null} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Reviews</Text>
        {reviews.isError ? (
          <Text style={styles.muted}>Não foi possível carregar as reviews agora.</Text>
        ) : others.length === 0 && !reviews.isLoading ? (
          <Text style={styles.muted}>Ninguém escreveu uma review ainda.</Text>
        ) : (
          others.map((review) => <ReviewCardView key={review.id} review={review} />)
        )}
        {reviews.hasNextPage ? (
          <Button
            label="Ver mais reviews"
            variant="secondary"
            loading={reviews.isFetchingNextPage}
            onPress={() => void reviews.fetchNextPage()}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  section: { gap: spacing.md },
  heading: { ...type.title, fontSize: 22, lineHeight: 28, color: colors.paper },
  muted: { ...type.body, color: colors.fog },
  loading: { paddingVertical: spacing.lg },
  invite: { gap: spacing.md, padding: spacing.md, borderRadius: radius.field, backgroundColor: colors.sleeve },
  inviteText: { ...type.body, color: colors.paper },
});
