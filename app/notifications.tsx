import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import {
  NotificationItem,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notifications/queries';
import { formatRelative } from '@/lib/format';
import { colors, fonts, spacing, type } from '@/theme';

function message(item: NotificationItem) {
  const of = item.mediaTitle ? ` de ${item.mediaTitle}` : '';
  switch (item.type) {
    case 'follow':
      return ' começou a seguir você.';
    case 'like':
      return ` curtiu sua review${of}.`;
    case 'comment':
      return ` comentou na sua review${of}.`;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const list = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const open = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id);
    if (item.type === 'follow' && item.actorUsername) router.push(`/user/${item.actorUsername}`);
    else if (item.reviewId) router.push(`/review/${item.reviewId}`);
  };

  const hasUnread = (unread.data ?? 0) > 0;

  let content: React.ReactNode;
  if (list.isPending) {
    content = <LoadingState />;
  } else if (list.isError) {
    content = (
      <ErrorState
        error={list.error}
        message="Não foi possível carregar as notificações."
        onRetry={() => void list.refetch()}
      />
    );
  } else {
    const items = list.data.pages.flat();
    content =
      items.length === 0 ? (
        <EmptyState
          title="Nenhuma notificação ainda"
          body="Você recebe um aviso quando alguém seguir você ou curtir e comentar suas reviews."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.mustard} />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? <ActivityIndicator color={colors.mustard} style={styles.footer} /> : <View />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.actorDisplayName}${message(item)}${item.read ? '' : ' Não lida.'}`}
              style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && styles.pressed]}
            >
              <Avatar uri={item.actorAvatarUrl} name={item.actorDisplayName} size={44} />
              <View style={styles.texts}>
                <Text style={styles.text}>
                  <Text style={styles.name}>{item.actorDisplayName}</Text>
                  {message(item)}
                </Text>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
        />
      );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () =>
            hasUnread ? (
              <Pressable
                onPress={() => markAll.mutate()}
                disabled={markAll.isPending}
                hitSlop={10}
                accessibilityRole="button"
                style={styles.markAll}
              >
                <Text style={styles.markAllLabel}>Marcar todas como lidas</Text>
              </Pressable>
            ) : null,
        }}
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xl },
  footer: { paddingVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  unread: { backgroundColor: colors.sleeve },
  pressed: { backgroundColor: colors.groove },
  texts: { flex: 1, gap: 2 },
  text: { ...type.body, color: colors.paper },
  name: { fontFamily: fonts.bold },
  time: { ...type.small, color: colors.fog },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.mustard },
  markAll: { marginRight: 4, paddingVertical: 6 },
  markAllLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.teal },
});
