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
  mediaItemId: string;
  mediaKind: MediaKind;
  mediaExternalId: string;
  mediaTitle: string;
  mediaArtistName: string | null;
  mediaCoverUrl: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
};

// Linha do banco (campos anuláveis no tipo gerado) -> modelo do app.
export function toReviewCard(row: Record<string, any>): ReviewCard {
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
    mediaItemId: row.media_item_id,
    mediaKind: row.media_kind,
    mediaExternalId: row.media_external_id,
    mediaTitle: row.media_title,
    mediaArtistName: row.media_artist_name,
    mediaCoverUrl: row.media_cover_url,
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

export type MyReview = { id: string; rating: number; body: string | null };

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

export type Cursor = { ts: string; id: string } | null;

type ReviewFilter = { userId?: string; mediaItemId?: string; followingOnly?: boolean };

// Uma página de reviews (feed, perfil ou item). Paginação por (created_at, id).
export async function fetchReviewPage(filter: ReviewFilter, cursor: Cursor): Promise<ReviewCard[]> {
  const { data, error } = await supabase.rpc('list_reviews', {
    p_user_id: filter.userId,
    p_media_item_id: filter.mediaItemId,
    p_following_only: filter.followingOnly,
    p_cursor_ts: cursor?.ts,
    p_cursor_id: cursor?.id,
    p_limit: REVIEWS_PAGE_SIZE,
  });
  if (error) throw error;
  return (data ?? []).map(toReviewCard);
}

export function nextReviewCursor(last: ReviewCard[]): Cursor | undefined {
  if (last.length < REVIEWS_PAGE_SIZE) return undefined;
  const tail = last[last.length - 1];
  return { ts: tail.createdAt, id: tail.id };
}

// Reviews públicas do item (a RLS já esconde as de perfis privados). Paginação por (created_at, id).
export function useItemReviews(mediaItemId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['reviews', 'item', mediaItemId],
    enabled: !!mediaItemId,
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) => fetchReviewPage({ mediaItemId: mediaItemId! }, pageParam),
    getNextPageParam: nextReviewCursor,
  });
}

function useInvalidateReviewData() {
  const queryClient = useQueryClient();
  return () => {
    // profile-stats e profile-summary: o contador e o resumo do perfil mudam a cada review.
    for (const key of ['media-item', 'review', 'reviews', 'rankings', 'profile-stats', 'profile-summary']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useSaveReview(item: MediaItem) {
  const userId = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
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
      return mediaItemId;
    },
    onSuccess: (mediaItemId, { rating, body }) => {
      // Mostra já o resumo da review salva; o id real chega na atualização logo em seguida.
      queryClient.setQueryData<MyReview | null>(['review', 'mine', mediaItemId, userId], (old) => ({
        id: old?.id ?? '',
        rating,
        body: body.trim() || null,
      }));
      invalidate();
    },
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
