import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Json } from '@/services/supabase/database.types';
import { musicProvider, toSnapshot } from '@/services/music';
import type { Artist } from '@/services/music';

export const MAX_FAVORITES = 5;

// Um artista do Top 5. Os que já estão salvos têm mediaItemId; os recém-escolhidos têm só o artista.
export type FavoriteEntry = {
  externalId: string;
  name: string;
  imageUrl: string | null;
  mediaItemId?: string;
  artist?: Artist;
};

export function useFavoriteArtists(userId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FavoriteEntry[]> => {
      const { data, error } = await supabase
        .from('favorite_artists')
        .select('position, item:media_items(id, external_id, title, cover_url)')
        .eq('user_id', userId!)
        .order('position', { ascending: true });
      if (error) throw error;

      const entries: FavoriteEntry[] = [];
      for (const row of data ?? []) {
        const item = Array.isArray(row.item) ? row.item[0] : row.item;
        if (item) {
          entries.push({
            externalId: item.external_id,
            name: item.title,
            imageUrl: item.cover_url,
            mediaItemId: item.id,
          });
        }
      }
      return entries;
    },
  });
}

export type ArtistSuggestion = {
  externalId: string;
  name: string;
  avgRating: number;
  reviewsCount: number;
};

// Artistas que o usuário mais bem avaliou, para sugerir enquanto o Top 5 está vazio.
export function useSuggestedArtists(enabled: boolean) {
  return useQuery({
    queryKey: ['favorites', 'suggestions'],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ArtistSuggestion[]> => {
      const { data, error } = await supabase.rpc('suggest_favorite_artists', { p_limit: 10 });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        externalId: row.artist_external_id,
        name: row.artist_name,
        avgRating: Number(row.avg_rating),
        reviewsCount: Number(row.reviews_count),
      }));
    },
  });
}

// Salva a lista inteira: registra no banco os artistas novos e troca o Top 5 numa transação só.
export function useSaveFavorites(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: FavoriteEntry[]) => {
      const ids: string[] = [];
      for (const entry of entries) {
        if (entry.mediaItemId) {
          ids.push(entry.mediaItemId);
          continue;
        }
        const artist = entry.artist ?? (await musicProvider.getArtist(entry.externalId));
        const { data, error } = await supabase.rpc('ensure_media_item', {
          p: toSnapshot(artist) as unknown as Json,
        });
        if (error) throw error;
        ids.push(data);
      }
      const { error } = await supabase.rpc('set_favorite_artists', { p_media_item_ids: ids });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });
}
