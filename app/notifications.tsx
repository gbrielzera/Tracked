import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MusicLoader } from '@/components/MusicLoader';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { PullRefresh } from '@/components/PullRefresh';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { NotificationItem, useMarkAllRead, useNotifications } from '@/features/notifications/queries';
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
  const markAll = useMarkAllRead();

  // Abrir a tela já conta como ler: o sino zera. As que chegaram novas continuam
  // destacadas só enquanto a tela está aberta, para dar para ver o que é novo.
  const fresh = useRef(new Set<string>());
  const items = list.data?.pages.flat() ?? [];
  for (const item of items) if (!item.read) fresh.current.add(item.id);
  const hasUnread = items.some((item) => !item.read);

  const { mutate: markAllRead, isPending: markingAll } = markAll;
  useEffect(() => {
    if (hasUnread && !markingAll) markAllRead();
  }, [hasUnread, markingAll, markAllRead]);

  const open = (item: NotificationItem) => {
    if (item.type === 'follow' && item.actorUsername) router.push(`/user/${item.actorUsername}`);
    else if (item.reviewId) router.push(`/review/${item.reviewId}`);
  };

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
          refreshControl={<PullRefresh refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? <MusicLoader compact style={styles.footer} /> : <View />
          }
          renderItem={({ item }) => {
            const isNew = fresh.current.has(item.id);
            return (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.actorDisplayName}${message(item)}${isNew ? ' Nova.' : ''}`}
              style={({ pressed }) => [styles.row, isNew && styles.unread, pressed && styles.pressed]}
            >
              <Avatar uri={item.actorAvatarUrl} name={item.actorDisplayName} size={44} />
              <View style={styles.texts}>
                <Text style={styles.text}>
                  <Text style={styles.name}>{item.actorDisplayName}</Text>
                  {message(item)}
                </Text>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
              </View>
              {isNew ? <View style={styles.dot} /> : null}
            </Pressable>
            );
          }}
        />
      );
  }

  return <View style={styles.screen}>{content}</View>;
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
});
