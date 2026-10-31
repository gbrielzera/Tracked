import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/stores/auth';
import { patchReviewCaches, restoreReviewCaches, snapshotReviewCaches } from './cache';
import { ReviewCard, toReviewCard } from './queries';

// ---------- detalhe de uma review ----------

export function useReviewDetail(reviewId: string) {
  return useQuery({
    queryKey: ['reviews', 'detail', reviewId],
    queryFn: async (): Promise<ReviewCard | null> => {
      const { data, error } = await supabase.rpc('get_review', { p_review_id: reviewId });
      if (error) throw error;
      return data?.[0] ? toReviewCard(data[0]) : null;
    },
  });
}

// ---------- curtidas (otimista, com rollback) ----------

export function useToggleLike() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ reviewId, like }: { reviewId: string; like: boolean }) => {
      if (!userId) throw new Error('not_signed_in');
      if (like) {
        const { error } = await supabase.from('review_likes').insert({ user_id: userId, review_id: reviewId });
        // 23505 = já curtida: o estado final é o mesmo que o pedido.
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('review_likes')
          .delete()
          .eq('user_id', userId)
          .eq('review_id', reviewId);
        if (error) throw error;
      }
    },
    onMutate: async ({ reviewId, like }) => {
      await queryClient.cancelQueries({ queryKey: ['reviews'] });
      const snapshot = snapshotReviewCaches(queryClient);
      patchReviewCaches(queryClient, reviewId, (r) => ({
        ...r,
        likedByMe: like,
        likesCount: Math.max(0, r.likesCount + (like ? 1 : -1)),
      }));
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      if (context) restoreReviewCaches(queryClient, context.snapshot);
    },
  });
}

// ---------- comentários ----------

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorUsername: string | null;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
};

const COMMENTS_PAGE_SIZE = 30;

export function useComments(reviewId: string) {
  return useInfiniteQuery({
    queryKey: ['comments', reviewId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from('review_comments')
        .select('id, body, created_at, user_id, author:profiles(username, display_name, avatar_url)')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true })
        .range(pageParam, pageParam + COMMENTS_PAGE_SIZE - 1);
      if (error) throw error;

      return (data ?? []).map((row) => {
        const author = Array.isArray(row.author) ? row.author[0] : row.author;
        return {
          id: row.id,
          body: row.body,
          createdAt: row.created_at,
          userId: row.user_id,
          authorUsername: author?.username ?? null,
          authorDisplayName: author?.display_name ?? 'Usuário',
          authorAvatarUrl: author?.avatar_url ?? null,
        };
      });
    },
    getNextPageParam: (last, all) => (last.length < COMMENTS_PAGE_SIZE ? undefined : all.length * COMMENTS_PAGE_SIZE),
  });
}

export function usePostComment(reviewId: string) {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (body: string) => {
      if (!userId) throw new Error('not_signed_in');
      const { error } = await supabase
        .from('review_comments')
        .insert({ review_id: reviewId, user_id: userId, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', reviewId] });
      void queryClient.invalidateQueries({ queryKey: ['comment-quota'] });
      patchReviewCaches(queryClient, reviewId, (r) => ({ ...r, commentsCount: r.commentsCount + 1 }));
    },
  });
}

export function useDeleteComment(reviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('review_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', reviewId] });
      void queryClient.invalidateQueries({ queryKey: ['comment-quota'] });
      patchReviewCaches(queryClient, reviewId, (r) => ({ ...r, commentsCount: Math.max(0, r.commentsCount - 1) }));
    },
  });
}

// Limite diário de comentários: visitante 3, conta 100 (aplicado pelo banco).
export function useCommentQuota() {
  return useQuery({
    queryKey: ['comment-quota'],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('comment_quota');
      if (error) throw error;
      const row = data?.[0];
      return { used: Number(row?.used ?? 0), max: Number(row?.max_allowed ?? 0) };
    },
  });
}

export function commentErrorMessage(error: unknown, isGuest: boolean) {
  const message = (error as { message?: string } | null)?.message;
  if (message === 'comment_limit') {
    return isGuest
      ? 'Você atingiu o limite de 3 comentários por dia como visitante. Crie uma conta para comentar mais.'
      : 'Você atingiu o limite de comentários de hoje. Tente de novo amanhã.';
  }
  return 'Não foi possível enviar o comentário. Tente de novo.';
}

// ---------- denúncias ----------

type ReportInput = { reason: string; reviewId?: string; commentId?: string };

export function useReport() {
  const userId = useAuth((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ reason, reviewId, commentId }: ReportInput) => {
      if (!userId) throw new Error('not_signed_in');
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        review_id: reviewId ?? null,
        comment_id: commentId ?? null,
        reason,
      });
      if (error) throw error;
    },
  });
}
