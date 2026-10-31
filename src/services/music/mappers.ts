import type { Album, AlbumRef, Artist, ArtistRef, ImageSet, Page, Track } from './types';

// Formatos crus da API do Deezer (só os campos que usamos).
type RawImages = {
  cover_small?: string | null;
  cover_medium?: string | null;
  cover_big?: string | null;
  cover_xl?: string | null;
  picture_small?: string | null;
  picture_medium?: string | null;
  picture_big?: string | null;
  picture_xl?: string | null;
};

export type RawArtist = RawImages & {
  id: number;
  name: string;
  nb_album?: number;
  nb_fan?: number;
};

export type RawAlbum = RawImages & {
  id: number;
  title: string;
  release_date?: string | null;
  nb_tracks?: number;
  duration?: number;
  genres?: { data?: { name: string }[] };
  label?: string | null;
  explicit_lyrics?: boolean;
  record_type?: string | null;
  artist?: { id: number; name: string };
  tracks?: { data?: RawTrack[] };
};

export type RawTrack = {
  id: number;
  title: string;
  duration?: number;
  release_date?: string | null;
  explicit_lyrics?: boolean;
  artist: RawImages & { id: number; name: string };
  album?: RawImages & { id: number; title: string; release_date?: string | null };
};

// Álbum e artista de uma faixa, no formato dos itens de catálogo (usado nos rankings por país,
// que só trazem faixas). O artista da faixa já vem com a foto.
export const albumOfTrack = (raw: RawTrack): Album | null =>
  raw.album ? mapAlbum(raw.album, artistRef(raw.artist)) : null;
export const artistOfTrack = (raw: RawTrack): Artist => mapArtist(raw.artist);

export type RawList<T> = { data?: T[]; total?: number; next?: string };

// O Deezer devolve uma imagem padrão com hash vazio (".../cover//...") quando não há capa.
const EMPTY_IMAGE = new RegExp('/(cover|artist)//');

function pickImages(sm?: string | null, md?: string | null, lg?: string | null, xl?: string | null): ImageSet | null {
  if (!sm || !md || !lg || !xl) return null;
  if (EMPTY_IMAGE.test(xl)) return null;
  return { sm, md, lg, xl };
}

const coverOf = (raw: RawImages) =>
  pickImages(raw.cover_small, raw.cover_medium, raw.cover_big, raw.cover_xl);

const pictureOf = (raw: RawImages) =>
  pickImages(raw.picture_small, raw.picture_medium, raw.picture_big, raw.picture_xl);

// Datas inválidas do Deezer chegam como "0000-00-00".
function cleanDate(value?: string | null) {
  if (!value || value.startsWith('0000')) return null;
  return value;
}

const artistRef = (raw: { id: number; name: string }): ArtistRef => ({ id: String(raw.id), name: raw.name });

export function mapArtist(raw: RawArtist): Artist {
  return {
    kind: 'artist',
    id: String(raw.id),
    name: raw.name,
    image: pictureOf(raw),
    fans: raw.nb_fan ?? null,
    albumCount: raw.nb_album ?? null,
  };
}

export function mapTrack(raw: RawTrack, albumOverride?: { ref: AlbumRef; releaseDate: string | null }): Track {
  let album: AlbumRef | null = null;
  if (albumOverride) {
    album = albumOverride.ref;
  } else if (raw.album) {
    album = { id: String(raw.album.id), title: raw.album.title, cover: coverOf(raw.album) };
  }
  return {
    kind: 'track',
    id: String(raw.id),
    title: raw.title,
    artist: artistRef(raw.artist),
    album,
    durationSec: raw.duration ?? 0,
    releaseDate: cleanDate(raw.release_date) ?? albumOverride?.releaseDate ?? cleanDate(raw.album?.release_date),
    explicit: raw.explicit_lyrics ?? false,
  };
}

export function mapAlbum(raw: RawAlbum, fallbackArtist?: ArtistRef): Album {
  const artist = raw.artist ? artistRef(raw.artist) : fallbackArtist;
  if (!artist) throw new Error('Álbum sem artista');

  const album: Album = {
    kind: 'album',
    id: String(raw.id),
    title: raw.title,
    artist,
    cover: coverOf(raw),
    releaseDate: cleanDate(raw.release_date),
    trackCount: raw.nb_tracks ?? null,
    durationSec: raw.duration ?? null,
    genres: raw.genres?.data?.map((genre) => genre.name) ?? [],
    label: raw.label ?? null,
    explicit: raw.explicit_lyrics ?? false,
    recordType: raw.record_type ?? null,
  };

  if (raw.tracks?.data) album.tracks = mapAlbumTracks(album, raw.tracks.data);
  return album;
}

// Faixas de dentro de um álbum herdam capa e data do álbum.
export function mapAlbumTracks(album: Album, rawTracks: RawTrack[]): Track[] {
  const override = {
    ref: { id: album.id, title: album.title, cover: album.cover } satisfies AlbumRef,
    releaseDate: album.releaseDate,
  };
  return rawTracks.map((raw) => mapTrack(raw, override));
}

export function toPage<R, T>(list: RawList<R>, index: number, map: (raw: R) => T): Page<T> {
  const items = (list.data ?? []).map(map);
  return {
    items,
    total: list.total ?? items.length,
    nextIndex: list.next && items.length > 0 ? index + items.length : null,
  };
}
