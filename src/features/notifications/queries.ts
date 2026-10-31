import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth, useAuthStatus } from '@/stores/auth';

export type NotificationType = 'follow' | 'like' | 'comment';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  reviewId: string | null;
  actorUsername: string | null;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  // Item avaliado (só para curtida e comentário).
  mediaTitle: string | null;
};

const PAGE_SIZE = 30;

type RawActor = { username: string | null; display_name: string; avatar_url: string | null };

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export function useNotifications() {
  const userId = useAuth((s) => s.session?.user.id);

  return useInfiniteQuery({
    queryKey: ['notifications', 'list', userId],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<NotificationItem[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, type, read_at, created_at, review_id, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url), review:reviews!notifications_review_id_fkey(media:media_items(title))',
        )
        .eq('recipient_id', userId!)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;

      return (data ?? []).map((row) => {
        const actor = first<RawActor>(row.actor as RawActor | RawActor[] | null);
        const review = first(row.review as { media: unknown } | { media: unknown }[] | null);
        const media = first(review?.media as { title: string } | { title: string }[] | null | undefined);
        return {
          id: row.id,
          type: row.type,
          createdAt: row.created_at,
          read: row.read_at !== null,
          reviewId: row.review_id,
          actorUsername: actor?.username ?? null,
          actorDisplayName: actor?.display_name ?? 'Alguém',
          actorAvatarUrl: actor?.avatar_url ?? null,
          mediaTitle: media?.title ?? null,
        };
      });
    },
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE),
  });
}

// Quantas notificações ainda não foram lidas (número do sino).
export function useUnreadCount() {
  const userId = useAuth((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['notifications', 'unread', userId],
    enabled: !!userId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId!)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

export function useMarkRead() {
  const userId = useAuth((s) => s.session?.user.id);
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_id', userId!);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useMarkAllRead() {
  const userId = useAuth((s) => s.session?.user.id);
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId!)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// Tempo real: quando chega (ou muda) uma notificação para mim, atualiza a lista e o contador.
// Monte uma vez só, na raiz do app. O Realtime respeita a RLS: só recebo as minhas.
export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.session?.user.id);
  const isAccount = useAuthStatus() === 'ready';

  useEffect(() => {
    if (!userId || !isAccount) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, isAccount, queryClient]);
}
