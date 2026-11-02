import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Json } from '@/services/supabase/database.types';
import { musicProvider, toSnapshot } from '@/services/music';
import type { Artist, Track } from '@/services/music';

export const MAX_FAVORITES = 5;

// Os dois "Top 5" do perfil têm o mesmo esquema: artistas favoritos e músicas do momento.
export type FavoriteKind = 'artist' | 'track';

// Um item da lista. Os que já estão salvos têm mediaItemId; os recém-escolhidos trazem o item do catálogo.
export type FavoriteEntry = {
  externalId: string;
  name: string;
  // Só para músicas: o artista.
  subtitle?: string | null;
  imageUrl: string | null;
  mediaItemId?: string;
  item?: Artist | Track;
};

// As duas tabelas têm as mesmas colunas, então o tipo de uma serve para a outra.
const TABLE = { artist: 'favorite_artists', track: 'favorite_tracks' } as const;

export function useFavorites(kind: FavoriteKind, userId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', kind, userId],
    enabled: !!userId,
    queryFn: async (): Promise<FavoriteEntry[]> => {
      const { data, error } = await supabase
        .from(TABLE[kind] as 'favorite_artists')
        .select('position, item:media_items(id, external_id, title, artist_name, cover_url)')
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
            subtitle: kind === 'track' ? item.artist_name : null,
            imageUrl: item.cover_url,
            mediaItemId: item.id,
          });
        }
      }
      return entries;
    },
  });
}

export type FavoriteSuggestion = {
  externalId: string;
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

// O que o usuário mais bem avaliou, para sugerir enquanto a lista não está cheia.
export function useSuggestedFavorites(kind: FavoriteKind, enabled: boolean) {
  return useQuery({
    queryKey: ['favorites', kind, 'suggestions'],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<FavoriteSuggestion[]> => {
      if (kind === 'artist') {
        const { data, error } = await supabase.rpc('suggest_favorite_artists', { p_limit: 10 });
        if (error) throw error;
        return (data ?? []).map((row) => ({ externalId: row.artist_external_id, name: row.artist_name }));
      }
      const { data, error } = await supabase.rpc('suggest_favorite_tracks', { p_limit: 10 });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        externalId: row.track_external_id,
        name: row.title,
        subtitle: row.artist_name,
        imageUrl: row.cover_url,
      }));
    },
  });
}

// Salva a lista inteira: registra no banco os itens novos e troca a lista numa transação só.
export function useSaveFavorites(kind: FavoriteKind, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: FavoriteEntry[]) => {
      const ids: string[] = [];
      for (const entry of entries) {
        if (entry.mediaItemId) {
          ids.push(entry.mediaItemId);
          continue;
        }
        const item =
          entry.item ??
          (kind === 'artist' ? await musicProvider.getArtist(entry.externalId) : await musicProvider.getTrack(entry.externalId));
        const { data, error } = await supabase.rpc('ensure_media_item', { p: toSnapshot(item) as unknown as Json });
        if (error) throw error;
        ids.push(data);
      }
      const { error } =
        kind === 'artist'
          ? await supabase.rpc('set_favorite_artists', { p_media_item_ids: ids })
          : await supabase.rpc('set_favorite_tracks', { p_media_item_ids: ids });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites', kind, userId] });
    },
  });
}
