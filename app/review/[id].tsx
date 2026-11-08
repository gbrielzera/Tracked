import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MusicLoader } from '@/components/MusicLoader';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { CommentRow } from '@/components/CommentRow';
import { PullRefresh } from '@/components/PullRefresh';
import { ReportModal } from '@/components/ReportModal';
import { ReviewCardView } from '@/components/ReviewCardView';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { CommentComposer } from '@/features/reviews/CommentComposer';
import { useComments, useDeleteComment, useReport, useReviewDetail } from '@/features/reviews/interactions';
import { useRefresh } from '@/lib/useRefresh';
import { useAuth } from '@/stores/auth';
import { colors, fonts, spacing, type } from '@/theme';

type ReportTarget = { reviewId: string } | { commentId: string };

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const insets = useSafeAreaInsets();
  const myId = useAuth((s) => s.session?.user.id);

  const review = useReviewDetail(id);
  const comments = useComments(id);
  const removeComment = useDeleteComment(id);
  const report = useReport();
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const refresh = useRefresh(() => Promise.all([review.refetch(), comments.refetch()]));

  // O campo de comentário fica no fim da lista: ao abrir o teclado, leva a tela até ele.
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50),
    );
    return () => show.remove();
  }, []);

  if (review.isPending) return <LoadingState />;
  if (review.isError) {
    return <ErrorState error={review.error} message="Não foi possível carregar a review." onRetry={() => void review.refetch()} />;
  }
  if (!review.data) {
    return <EmptyState title="Review não encontrada" body="Ela pode ter sido excluída ou estar privada." />;
  }

  const data = review.data;
  const isOwnReview = data.authorId === myId;
  const list = comments.data?.pages.flat() ?? [];

  const confirmDelete = (commentId: string) =>
    Alert.alert('Excluir comentário', 'Esse comentário será apagado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => removeComment.mutate(commentId) },
    ]);

  const sendReport = (reason: string) => {
    if (!target) return;
    report.mutate(
      { reason, ...target },
      {
        onSuccess: () => {
          setTarget(null);
          Alert.alert('Denúncia enviada', 'Obrigado por ajudar a manter o Tracked seguro. Vamos analisar.');
        },
        onError: () => {
          setTarget(null);
          Alert.alert('Não foi possível denunciar', 'Verifique sua conexão e tente de novo.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        ref={scrollRef}
        refreshControl={<PullRefresh refreshing={refresh.refreshing} onRefresh={() => void refresh.onRefresh()} />}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ReviewCardView review={data} showAuthor showMedia openable={false} />
        {!isOwnReview ? (
          <Pressable onPress={() => setTarget({ reviewId: data.id })} hitSlop={8} accessibilityRole="button">
            <Text style={styles.reportLink}>Denunciar esta review</Text>
          </Pressable>
        ) : null}

        <Text style={styles.heading}>Comentários</Text>

        {comments.isPending ? (
          <MusicLoader compact style={styles.loading} />
        ) : comments.isError ? (
          <Text style={styles.muted}>Não foi possível carregar os comentários.</Text>
        ) : list.length === 0 ? (
          <Text style={styles.muted}>Seja o primeiro a comentar.</Text>
        ) : (
          list.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              canDelete={comment.userId === myId || isOwnReview}
              canReport={comment.userId !== myId}
              onDelete={() => confirmDelete(comment.id)}
              onReport={() => setTarget({ commentId: comment.id })}
            />
          ))
        )}
        {comments.hasNextPage ? (
          <Button
            label="Ver mais comentários"
            variant="secondary"
            loading={comments.isFetchingNextPage}
            onPress={() => void comments.fetchNextPage()}
          />
        ) : null}

        <CommentComposer reviewId={data.id} />
      </ScrollView>

      <ReportModal
        visible={target !== null}
        title={target && 'commentId' in target ? 'Denunciar comentário' : 'Denunciar review'}
        busy={report.isPending}
        onClose={() => setTarget(null)}
        onSelect={sendReport}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.paper, marginTop: spacing.sm },
  muted: { ...type.body, color: colors.fog },
  reportLink: { ...type.small, fontFamily: fonts.medium, color: colors.fog },
  loading: { paddingVertical: spacing.md },
});
