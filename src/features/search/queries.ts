import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

export type UserResult = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function useUserSearch(submittedQuery: string) {
  return useQuery({
    queryKey: ['search', 'users', submittedQuery],
    enabled: submittedQuery.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<UserResult[]> => {
      const { data, error } = await supabase.rpc('search_users', { p_query: submittedQuery, p_limit: 30 });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      }));
    },
  });
}
