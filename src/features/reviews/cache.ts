import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import type { ReviewCard } from './queries';

// Toda lista ou detalhe de review fica sob a chave ['reviews', ...]:
// ['reviews','item',id] | ['reviews','user',id] | ['reviews','feed'] | ['reviews','detail',id]
type Cached = InfiniteData<ReviewCard[]> | ReviewCard | null | undefined;

// Aplica a mesma mudança à review em todos os caches (curtir/comentar aparece em todo lugar).
export function patchReviewCaches(
  queryClient: QueryClient,
  reviewId: string,
  patch: (review: ReviewCard) => ReviewCard,
) {
  queryClient.setQueriesData<Cached>({ queryKey: ['reviews'] }, (data) => {
    if (!data) return data;
    if ('pages' in data) {
      return { ...data, pages: data.pages.map((page) => page.map((r) => (r.id === reviewId ? patch(r) : r))) };
    }
    return data.id === reviewId ? patch(data) : data;
  });
}

export type ReviewCacheSnapshot = [QueryKey, unknown][];

export function snapshotReviewCaches(queryClient: QueryClient): ReviewCacheSnapshot {
  return queryClient.getQueriesData({ queryKey: ['reviews'] });
}

export function restoreReviewCaches(queryClient: QueryClient, snapshot: ReviewCacheSnapshot) {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}
