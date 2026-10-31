import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GuestGate } from '@/components/GuestGate';
import { PullRefresh } from '@/components/PullRefresh';
import { ReviewCardView } from '@/components/ReviewCardView';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useFeed } from '@/features/social/queries';
import { useAuthStatus } from '@/stores/auth';
import { colors, spacing } from '@/theme';

export default function FeedScreen() {
  const router = useRouter();
  const status = useAuthStatus();
  const isGuest = status === 'guest';
  const feed = useFeed(!isGuest);

  if (isGuest) {
    return (
      <GuestGate
        title="Veja o que as pessoas estão ouvindo"
        body="Crie uma conta para seguir pessoas e ler as reviews delas aqui."
      />
    );
  }

  if (feed.isPending) return <LoadingState />;
  if (feed.isError) {
    return (
      <ErrorState
        error={feed.error}
        message="Não foi possível carregar o feed. Verifique sua conexão."
        onRetry={() => void feed.refetch()}
      />
    );
  }

  const reviews = feed.data.pages.flat();

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="Seu feed está vazio"
        body="Siga pessoas para ver aqui as reviews que elas escrevem."
        actionLabel="Buscar pessoas"
        onAction={() => router.navigate('/search')}
      />
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={reviews}
      keyExtractor={(review) => review.id}
      renderItem={({ item }) => <ReviewCardView review={item} showAuthor showMedia />}
      refreshControl={
        <PullRefresh
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => void feed.refetch()}
        />
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      ListFooterComponent={
        feed.isFetchingNextPage ? <ActivityIndicator color={colors.mustard} style={styles.footer} /> : <View />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  footer: { paddingVertical: spacing.lg },
});
