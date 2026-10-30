import { DeezerClient, deezerClient } from './deezerClient';
import { MusicApiError } from './errors';
import {
  RawAlbum,
  RawArtist,
  RawList,
  RawTrack,
  mapAlbum,
  mapAlbumTracks,
  mapArtist,
  mapTrack,
  toPage,
} from './mappers';
import type { Album, Artist, ArtistRef, Chart, MediaKind, MusicProvider, PageOptions, Track } from './types';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

// IDs vão direto no caminho da URL: aceita só dígitos.
function assertId(id: string) {
  if (!/^[0-9]{1,20}$/.test(id)) throw new MusicApiError('not_found', `ID inválido: ${id}`);
  return id;
}

function pageParams(opts?: PageOptions) {
  const limit = Math.min(Math.max(opts?.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const index = Math.max(opts?.index ?? 0, 0);
  return { index, limit };
}

export function createDeezerProvider(client: DeezerClient = deezerClient): MusicProvider {
  async function search(kind: MediaKind, query: string, opts?: PageOptions) {
    const { index, limit } = pageParams(opts);
    const q = query.trim();
    if (q.length === 0) return { items: [], total: 0, nextIndex: null };

    const params = { q, index, limit };
    switch (kind) {
      case 'track':
        return toPage(await client.get<RawList<RawTrack>>('/search/track', params), index, (raw) => mapTrack(raw));
      case 'album':
        return toPage(await client.get<RawList<RawAlbum>>('/search/album', params), index, (raw) => mapAlbum(raw));
      case 'artist':
        return toPage(await client.get<RawList<RawArtist>>('/search/artist', params), index, mapArtist);
    }
  }

  return {
    name: 'deezer',
    search: search as MusicProvider['search'],

    async getTrack(id: string): Promise<Track> {
      return mapTrack(await client.get<RawTrack>(`/track/${assertId(id)}`));
    },

    async getAlbum(id: string): Promise<Album> {
      const safeId = assertId(id);
      const album = mapAlbum(await client.get<RawAlbum>(`/album/${safeId}`));

      // O álbum já traz as faixas; só busca a lista completa se vier incompleta.
      const loaded = album.tracks?.length ?? 0;
      if (album.trackCount && loaded < album.trackCount) {
        const full = await client.get<RawList<RawTrack>>(`/album/${safeId}/tracks`, { limit: 500 });
        album.tracks = mapAlbumTracks(album, full.data ?? []);
      }
      return album;
    },

    async getArtist(id: string): Promise<Artist> {
      return mapArtist(await client.get<RawArtist>(`/artist/${assertId(id)}`));
    },

    async getArtistTopTracks(id: string, limit = 10): Promise<Track[]> {
      const list = await client.get<RawList<RawTrack>>(`/artist/${assertId(id)}/top`, {
        limit: Math.min(Math.max(limit, 1), MAX_PAGE_SIZE),
      });
      return (list.data ?? []).map((raw) => mapTrack(raw));
    },

    async getArtistAlbums(artist: ArtistRef, opts?: PageOptions) {
      const { index, limit } = pageParams(opts);
      const list = await client.get<RawList<RawAlbum>>(`/artist/${assertId(artist.id)}/albums`, { index, limit });
      // A lista de álbuns do artista não repete o artista em cada item.
      return toPage(list, index, (raw) => mapAlbum(raw, artist));
    },

    async getChart(limit = 25): Promise<Chart> {
      const chart = await client.get<{
        tracks?: RawList<RawTrack>;
        albums?: RawList<RawAlbum>;
        artists?: RawList<RawArtist>;
      }>('/chart/0', { limit: Math.min(Math.max(limit, 1), 100) });

      return {
        tracks: (chart.tracks?.data ?? []).map((raw) => mapTrack(raw)),
        albums: (chart.albums?.data ?? []).map((raw) => mapAlbum(raw)),
        artists: (chart.artists?.data ?? []).map(mapArtist),
      };
    },
  };
}
