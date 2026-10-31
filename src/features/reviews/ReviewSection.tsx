import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { ReviewCardView } from '@/components/ReviewCardView';
import type { MediaItem } from '@/services/music';
import { useAuthStatus } from '@/stores/auth';
import { colors, radius, spacing, type } from '@/theme';
import { MyReviewSummary } from './MyReviewSummary';
import { ReviewForm } from './ReviewForm';
import { useItemReviews, useMediaItemRow, useMyReview } from './queries';

// Parte de baixo das telas de detalhe: minha avaliação + reviews das pessoas (inclusive a minha).
export function ReviewSection({ item }: { item: MediaItem }) {
  const router = useRouter();
  const isGuest = useAuthStatus() === 'guest';

  const row = useMediaItemRow(item.kind, item.id);
  const mediaItemId = row.data?.id;
  const mine = useMyReview(isGuest ? undefined : mediaItemId);
  const reviews = useItemReviews(mediaItemId);

  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const flash = (message: string) => {
    setNotice(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3000);
  };

  // Só mostra o carregando na primeira vez; depois não desmonta ao recarregar.
  const loaded = useRef(false);
  const loadingMine = (row.isLoading || mine.isLoading) && !loaded.current;
  if (!isGuest && !loadingMine) loaded.current = true;

  const existing = mine.data ?? null;
  const items = reviews.data?.pages.flat() ?? [];

  let yourReview: React.ReactNode;
  if (isGuest) {
    yourReview = (
      <View style={styles.invite}>
        <Text style={styles.inviteText}>
          Crie uma conta para dar nota e escrever sua review. Visitantes podem ler e comentar.
        </Text>
        <Button label="Criar conta" onPress={() => router.push('/upgrade')} />
      </View>
    );
  } else if (loadingMine) {
    yourReview = <ActivityIndicator color={colors.mustard} style={styles.loading} />;
  } else if (existing && !editing) {
    yourReview = (
      <MyReviewSummary review={existing} onEdit={() => setEditing(true)} onDeleted={() => flash('Review excluída.')} />
    );
  } else {
    yourReview = (
      <ReviewForm
        item={item}
        existing={existing}
        onSaved={(message) => {
          setEditing(false);
          flash(message);
        }}
        onCancel={existing ? () => setEditing(false) : undefined}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        <Text style={styles.heading}>Sua avaliação</Text>
        {notice ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        {yourReview}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Reviews</Text>
        {reviews.isError ? (
          <Text style={styles.muted}>Não foi possível carregar as reviews agora.</Text>
        ) : items.length === 0 && !reviews.isLoading ? (
          <Text style={styles.muted}>Ninguém escreveu uma review ainda.</Text>
        ) : (
          items.map((review) => <ReviewCardView key={review.id} review={review} />)
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
  notice: { ...type.small, color: colors.teal },
  loading: { paddingVertical: spacing.lg },
  invite: { gap: spacing.md, padding: spacing.md, borderRadius: radius.field, backgroundColor: colors.sleeve },
  inviteText: { ...type.body, color: colors.paper },
});
