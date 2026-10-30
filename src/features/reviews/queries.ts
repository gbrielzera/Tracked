import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Json } from '@/services/supabase/database.types';
import { toSnapshot } from '@/services/music';
import type { MediaItem, MediaKind } from '@/services/music';
import { useAuth } from '@/stores/auth';

export const REVIEWS_PAGE_SIZE = 20;

export type ReviewCard = {
  id: string;
  createdAt: string;
  updatedAt: string;
  rating: number;
  body: string | null;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
};

// Linha do banco (campos anuláveis no tipo gerado) -> modelo do app.
function toReviewCard(row: Record<string, any>): ReviewCard {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rating: Number(row.rating),
    body: row.body,
    authorId: row.author_id,
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name ?? 'Usuário',
    authorAvatarUrl: row.author_avatar_url,
    likesCount: Number(row.likes_count ?? 0),
    commentsCount: Number(row.comments_count ?? 0),
    likedByMe: !!row.liked_by_me,
  };
}

// Item do catálogo já registrado no nosso banco (existe depois da primeira avaliação).
export function useMediaItemRow(kind: MediaKind, externalId: string) {
  return useQuery({
    queryKey: ['media-item', kind, externalId],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_items')
        .select('id, avg_rating, ratings_count')
        .eq('provider', 'deezer')
        .eq('kind', kind)
        .eq('external_id', externalId)
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id, avgRating: data.avg_rating, ratingsCount: data.ratings_count } : null;
    },
  });
}

export function useMyReview(mediaItemId: string | undefined) {
  const userId = useAuth((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['review', 'mine', mediaItemId, userId],
    enabled: !!mediaItemId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, body')
        .eq('media_item_id', mediaItemId!)
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id, rating: Number(data.rating), body: data.body } : null;
    },
  });
}

type Cursor = { ts: string; id: string } | null;

// Reviews públicas do item (a RLS já esconde as de perfis privados). Paginação por (created_at, id).
export function useItemReviews(mediaItemId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['reviews', 'item', mediaItemId],
    enabled: !!mediaItemId,
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('list_reviews', {
        p_media_item_id: mediaItemId!,
        p_cursor_ts: pageParam?.ts,
        p_cursor_id: pageParam?.id,
        p_limit: REVIEWS_PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []).map(toReviewCard);
    },
    getNextPageParam: (last): Cursor | undefined => {
      if (last.length < REVIEWS_PAGE_SIZE) return undefined;
      const tail = last[last.length - 1];
      return { ts: tail.createdAt, id: tail.id };
    },
  });
}

function useInvalidateReviewData() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ['media-item', 'review', 'reviews', 'feed', 'rankings']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useSaveReview(item: MediaItem) {
  const userId = useAuth((s) => s.session?.user.id);
  const invalidate = useInvalidateReviewData();

  return useMutation({
    mutationFn: async ({ rating, body }: { rating: number; body: string }) => {
      if (!userId) throw new Error('not_signed_in');
      const { data: mediaItemId, error: ensureError } = await supabase.rpc('ensure_media_item', {
        p: toSnapshot(item) as unknown as Json,
      });
      if (ensureError) throw ensureError;

      const { error } = await supabase.from('reviews').upsert(
        { user_id: userId, media_item_id: mediaItemId, rating, body: body.trim() || null },
        { onConflict: 'user_id,media_item_id' },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteReview() {
  const invalidate = useInvalidateReviewData();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
