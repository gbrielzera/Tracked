import { QueryClient } from '@tanstack/react-query';
import { MusicApiError } from '@/services/music/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      // Item inexistente não melhora tentando de novo; o cliente do Deezer já repete a cota.
      retry: (failureCount, error) =>
        !(error instanceof MusicApiError && error.code === 'not_found') && failureCount < 1,
    },
  },
});
