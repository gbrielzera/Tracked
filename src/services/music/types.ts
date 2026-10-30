// Tipos normalizados: o resto do app nunca enxerga o formato cru do Deezer.

export type MediaKind = 'track' | 'album' | 'artist';

// sm 56px, md 250px, lg 500px, xl 1000px
export type ImageSet = { sm: string; md: string; lg: string; xl: string };

export type ArtistRef = { id: string; name: string };
export type AlbumRef = { id: string; title: string; cover: ImageSet | null };

export type Track = {
  kind: 'track';
  id: string;
  title: string;
  artist: ArtistRef;
  album: AlbumRef | null;
  durationSec: number;
  releaseDate: string | null;
  explicit: boolean;
};

export type Album = {
  kind: 'album';
  id: string;
  title: string;
  artist: ArtistRef;
  cover: ImageSet | null;
  releaseDate: string | null;
  trackCount: number | null;
  durationSec: number | null;
  genres: string[];
  label: string | null;
  explicit: boolean;
  recordType: string | null;
  // Só vem preenchido em getAlbum.
  tracks?: Track[];
};

export type Artist = {
  kind: 'artist';
  id: string;
  name: string;
  image: ImageSet | null;
  fans: number | null;
  albumCount: number | null;
};

export type MediaItem = Track | Album | Artist;

export type Page<T> = {
  items: T[];
  total: number;
  // Valor para o próximo `index`; null quando acabou.
  nextIndex: number | null;
};

export type PageOptions = { index?: number; limit?: number };

export type Chart = { tracks: Track[]; albums: Album[]; artists: Artist[] };

// Dados mínimos guardados em media_items (RPC ensure_media_item).
export type MediaSnapshot = {
  kind: MediaKind;
  provider: string;
  external_id: string;
  title: string;
  artist_name: string | null;
  artist_external_id: string | null;
  album_title: string | null;
  cover_url: string | null;
  release_date: string | null;
};

export interface MusicProvider {
  readonly name: string;
  search(kind: 'track', query: string, opts?: PageOptions): Promise<Page<Track>>;
  search(kind: 'album', query: string, opts?: PageOptions): Promise<Page<Album>>;
  search(kind: 'artist', query: string, opts?: PageOptions): Promise<Page<Artist>>;
  getTrack(id: string): Promise<Track>;
  getAlbum(id: string): Promise<Album>;
  getArtist(id: string): Promise<Artist>;
  getArtistTopTracks(id: string, limit?: number): Promise<Track[]>;
  getArtistAlbums(artist: ArtistRef, opts?: PageOptions): Promise<Page<Album>>;
  getChart(limit?: number): Promise<Chart>;
}
