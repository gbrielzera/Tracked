import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PersonRow } from '@/components/PersonRow';
import { PullRefresh } from '@/components/PullRefresh';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useRefresh } from '@/lib/useRefresh';
import { colors, spacing } from '@/theme';
import { useFollowList, useProfile } from './queries';

export function FollowListScreen({ direction }: { direction: 'followers' | 'following' }) {
  const params = useLocalSearchParams<{ username: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const profile = useProfile(username);
  const list = useFollowList(profile.data?.id, direction);
  const title = direction === 'followers' ? 'Seguidores' : 'Seguindo';
  const refresh = useRefresh(() => Promise.all([profile.refetch(), list.refetch()]));

  let content: React.ReactNode;
  if (profile.isPending || (profile.data && list.isPending)) {
    content = <LoadingState />;
  } else if (profile.isError || list.isError || !profile.data) {
    content = (
      <ErrorState
        error={profile.error ?? list.error}
        message="Não foi possível carregar a lista."
        onRetry={() => {
          void profile.refetch();
          void list.refetch();
        }}
      />
    );
  } else {
    const people = list.data?.pages.flat() ?? [];
    content =
      people.length === 0 ? (
        <EmptyState
          title={direction === 'followers' ? 'Ninguém segue ainda' : 'Não segue ninguém ainda'}
          body={`@${username}`}
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(person) => person.id}
          contentContainerStyle={styles.list}
          refreshControl={<PullRefresh refreshing={refresh.refreshing} onRefresh={() => void refresh.onRefresh()} />}
          renderItem={({ item }) => (
            <PersonRow username={item.username} displayName={item.displayName} avatarUrl={item.avatarUrl} />
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? <ActivityIndicator color={colors.mustard} style={styles.footer} /> : <View />
          }
        />
      );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingVertical: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
