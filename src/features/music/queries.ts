import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { musicProvider, searchMedia } from '@/services/music';
import type { ArtistRef, MediaKind } from '@/services/music';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// country: código ISO alfa-2 do ranking por país; ausente = global.
export const useChart = (limit = 25, country?: string) =>
  useQuery({
    queryKey: ['chart', limit, country ?? 'world'],
    queryFn: () => musicProvider.getChart(limit, country),
    staleTime: HOUR,
  });

export const useTrack = (id: string) =>
  useQuery({ queryKey: ['deezer', 'track', id], queryFn: () => musicProvider.getTrack(id), staleTime: DAY });

export const useAlbum = (id: string) =>
  useQuery({ queryKey: ['deezer', 'album', id], queryFn: () => musicProvider.getAlbum(id), staleTime: DAY });

export const useArtist = (id: string) =>
  useQuery({ queryKey: ['deezer', 'artist', id], queryFn: () => musicProvider.getArtist(id), staleTime: DAY });

export const useArtistTopTracks = (id: string) =>
  useQuery({
    queryKey: ['deezer', 'artist', id, 'top'],
    queryFn: () => musicProvider.getArtistTopTracks(id, 10),
    staleTime: DAY,
  });

export function useArtistAlbums(artist: ArtistRef | undefined) {
  return useInfiniteQuery({
    queryKey: ['deezer', 'artist', artist?.id, 'albums'],
    enabled: !!artist,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => musicProvider.getArtistAlbums(artist!, { index: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.nextIndex ?? undefined,
    staleTime: DAY,
  });
}

// Quem chama já espera o usuário parar de digitar (debounce) antes de passar o texto,
// para poupar a cota do Deezer. Texto curto (ou vazio) desliga a busca.
// Mantém o resultado anterior na tela enquanto o novo carrega, sem piscar a cada pausa.
export function useSearch(kind: MediaKind, submittedQuery: string) {
  return useInfiniteQuery({
    queryKey: ['search', kind, submittedQuery],
    enabled: submittedQuery.length >= 2,
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchMedia(kind, submittedQuery, { index: pageParam }),
    getNextPageParam: (last) => last.nextIndex ?? undefined,
    staleTime: 10 * 60 * 1000,
  });
}
