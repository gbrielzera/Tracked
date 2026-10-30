import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { MediaItem } from '@/services/music';

export type MusicInfo = {
  summary: string | null;
  tags: string[];
  listeners: number | null;
  playcount: number | null;
  url: string | null;
  source: 'lastfm';
};

type Response = { info: MusicInfo | null; cached?: boolean; unavailable?: boolean };

function requestBody(item: MediaItem) {
  switch (item.kind) {
    case 'track':
      return { kind: item.kind, externalId: item.id, title: item.title, artistName: item.artist.name };
    case 'album':
      return { kind: item.kind, externalId: item.id, title: item.title, artistName: item.artist.name };
    case 'artist':
      return { kind: item.kind, externalId: item.id, title: item.name, artistName: null };
  }
}

// Descrição curta do Last.fm. Se falhar, a tela só omite a descrição (não é erro bloqueante).
export function useMusicInfo(item: MediaItem | undefined) {
  return useQuery({
    queryKey: ['music-info', item?.kind, item?.id],
    enabled: !!item,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Response>('music-info', {
        body: requestBody(item!),
      });
      if (error) throw error;
      if (data?.unavailable) throw new Error('lastfm_unavailable');
      return data?.info ?? null;
    },
  });
}
