import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cursor, fetchReviewPage, nextReviewCursor } from '@/features/reviews/queries';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/stores/auth';

// ---------- feed e reviews de um perfil ----------

// Reviews de quem eu sigo, da mais nova para a mais antiga.
export function useFeed(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['reviews', 'feed'],
    enabled,
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) => fetchReviewPage({ followingOnly: true }, pageParam),
    getNextPageParam: nextReviewCursor,
  });
}

export function useUserReviews(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['reviews', 'user', userId],
    enabled: !!userId,
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) => fetchReviewPage({ userId: userId! }, pageParam),
    getNextPageParam: nextReviewCursor,
  });
}

// ---------- perfil ----------

export type PublicProfile = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  reviewsPrivate: boolean;
};

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async (): Promise<PublicProfile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, reviews_private')
        .eq('username', username)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        reviewsPrivate: data.reviews_private,
      };
    },
  });
}

export type ProfileStats = {
  followers: number;
  following: number;
  reviews: number;
  isFollowing: boolean;
};

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileStats> => {
      const { data, error } = await supabase.rpc('get_profile_stats', { p_user_id: userId! });
      if (error) throw error;
      const row = data?.[0];
      return {
        followers: Number(row?.followers ?? 0),
        following: Number(row?.following ?? 0),
        reviews: Number(row?.reviews ?? 0),
        isFollowing: !!row?.is_following,
      };
    },
  });
}

// ---------- seguir ----------

export function useToggleFollow(targetId: string) {
  const queryClient = useQueryClient();
  const myId = useAuth((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (follow: boolean) => {
      if (!myId) throw new Error('not_signed_in');
      if (follow) {
        const { error } = await supabase.from('follows').insert({ follower_id: myId, following_id: targetId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', myId)
          .eq('following_id', targetId);
        if (error) throw error;
      }
    },
    onMutate: async (follow) => {
      const keys = [
        ['profile-stats', targetId],
        ['profile-stats', myId],
      ];
      await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const snapshot = keys.map((queryKey) => [queryKey, queryClient.getQueryData<ProfileStats>(queryKey)] as const);

      const delta = follow ? 1 : -1;
      queryClient.setQueryData<ProfileStats>(['profile-stats', targetId], (old) =>
        old ? { ...old, isFollowing: follow, followers: Math.max(0, old.followers + delta) } : old,
      );
      queryClient.setQueryData<ProfileStats>(['profile-stats', myId], (old) =>
        old ? { ...old, following: Math.max(0, old.following + delta) } : old,
      );
      return { snapshot };
    },
    onError: (_error, _follow, context) => {
      context?.snapshot.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: () => {
      // O feed muda quando alguém passa a ser seguido ou deixa de ser.
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['follow-list'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    },
  });
}

// ---------- seguidores e seguindo ----------

export type Person = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
};

type RawPerson = { id: string; username: string | null; display_name: string; avatar_url: string | null };

const PEOPLE_PAGE_SIZE = 30;

const toPerson = (raw: RawPerson | RawPerson[] | null): Person | null => {
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row
    ? { id: row.id, username: row.username, displayName: row.display_name, avatarUrl: row.avatar_url }
    : null;
};

export function useFollowList(userId: string | undefined, direction: 'followers' | 'following') {
  return useInfiniteQuery({
    queryKey: ['follow-list', userId, direction],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Person[]> => {
      const range = [pageParam, pageParam + PEOPLE_PAGE_SIZE - 1] as const;

      if (direction === 'followers') {
        const { data, error } = await supabase
          .from('follows')
          .select('person:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
          .eq('following_id', userId!)
          .order('created_at', { ascending: false })
          .range(...range);
        if (error) throw error;
        return (data ?? []).map((row) => toPerson(row.person)).filter((p): p is Person => !!p);
      }

      const { data, error } = await supabase
        .from('follows')
        .select('person:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)')
        .eq('follower_id', userId!)
        .order('created_at', { ascending: false })
        .range(...range);
      if (error) throw error;
      return (data ?? []).map((row) => toPerson(row.person)).filter((p): p is Person => !!p);
    },
    getNextPageParam: (last, all) => (last.length < PEOPLE_PAGE_SIZE ? undefined : all.length * PEOPLE_PAGE_SIZE),
  });
}
