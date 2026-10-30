import type { MediaItem, MediaSnapshot } from './types';

// Converte um item normalizado no snapshot aceito pela RPC ensure_media_item.
export function toSnapshot(item: MediaItem): MediaSnapshot {
  switch (item.kind) {
    case 'track':
      return {
        kind: 'track',
        provider: 'deezer',
        external_id: item.id,
        title: item.title,
        artist_name: item.artist.name,
        artist_external_id: item.artist.id,
        album_title: item.album?.title ?? null,
        cover_url: item.album?.cover?.md ?? null,
        release_date: item.releaseDate,
      };
    case 'album':
      return {
        kind: 'album',
        provider: 'deezer',
        external_id: item.id,
        title: item.title,
        artist_name: item.artist.name,
        artist_external_id: item.artist.id,
        album_title: null,
        cover_url: item.cover?.md ?? null,
        release_date: item.releaseDate,
      };
    case 'artist':
      return {
        kind: 'artist',
        provider: 'deezer',
        external_id: item.id,
        title: item.name,
        // Para artistas, nome e id do artista são os do próprio item (usado nos rankings).
        artist_name: item.name,
        artist_external_id: item.id,
        album_title: null,
        cover_url: item.image?.md ?? null,
        release_date: null,
      };
  }
}
