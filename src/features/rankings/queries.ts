import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

export type RankingList = 'track' | 'album' | 'artist' | 'discography';

export type RankingRow = {
  position: number;
  key: string;
  externalId: string;
  title: string;
  artistName: string | null;
  coverUrl: string | null;
  votes: number;
  avgRating: number;
  score: number;
};

// "Mais bem avaliados" da comunidade (média bayesiana calculada no banco).
export function useRankings(list: RankingList, enabled = true) {
  return useQuery({
    queryKey: ['rankings', list],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RankingRow[]> => {
      const { data, error } = await supabase.rpc('get_rankings', { p_list: list, p_limit: 50 });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        position: Number(row.rank_position),
        key: row.key,
        externalId: row.external_id,
        title: row.title,
        artistName: row.artist_name ?? null,
        coverUrl: row.cover_url ?? null,
        votes: Number(row.votes),
        avgRating: Number(row.avg_rating),
        score: Number(row.score),
      }));
    },
  });
}
