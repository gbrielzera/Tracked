// Lógica pura do Last.fm (sem APIs do Deno), para poder ser testada fora do Supabase.

export type Kind = 'track' | 'album' | 'artist';

export type MusicInfo = {
  summary: string | null;
  tags: string[];
  listeners: number | null;
  playcount: number | null;
  url: string | null;
  source: 'lastfm';
};

export type LookupInput = { kind: Kind; title: string; artistName?: string | null };

export type ParseResult =
  | { status: 'found'; info: MusicInfo }
  | { status: 'not_found' }
  | { status: 'unavailable' };

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const EMPTY_INFO: MusicInfo = {
  summary: null,
  tags: [],
  listeners: null,
  playcount: null,
  url: null,
  source: 'lastfm',
};

// Faixas e álbuns precisam do nome do artista; sem ele não há como consultar.
export function buildLookupUrl(input: LookupInput, apiKey: string): string | null {
  const params = new URLSearchParams({
    format: 'json',
    autocorrect: '1',
    lang: 'pt',
    api_key: apiKey,
  });

  if (input.kind === 'artist') {
    params.set('method', 'artist.getinfo');
    params.set('artist', input.title);
  } else {
    if (!input.artistName) return null;
    params.set('method', input.kind === 'track' ? 'track.getinfo' : 'album.getinfo');
    params.set('artist', input.artistName);
    params.set(input.kind, input.title);
  }
  return `${LASTFM_BASE}?${params.toString()}`;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

// Remove HTML, o convite "Read more on Last.fm" e corta em limite de palavra.
export function cleanSummary(html: string | null | undefined, maxLength = 600): string | null {
  if (!html) return null;

  let text = html.replace(/<[^>]*>/g, ' ');
  text = text.replace(/&(amp|quot|#39|lt|gt|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);
  text = text.replace(/read more on last\.fm\.?/gi, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length === 0) return null;

  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Last.fm devolve um objeto (e não uma lista) quando só há uma tag.
function readTags(source: unknown): string[] {
  const tag = (source as { tag?: unknown } | undefined)?.tag;
  const list = Array.isArray(tag) ? tag : tag ? [tag] : [];
  return list
    .map((t) => String((t as { name?: unknown }).name ?? '').trim().toLowerCase())
    .filter((name) => name.length > 0)
    .slice(0, 5);
}

export function parseResponse(kind: Kind, payload: unknown): ParseResult {
  const body = payload as Record<string, any> | null;
  if (!body || typeof body !== 'object') return { status: 'unavailable' };

  if (body.error !== undefined) {
    // 6 = não encontrado. Os demais (cota, serviço fora, chave inválida) não devem ir para o cache.
    return Number(body.error) === 6 ? { status: 'not_found' } : { status: 'unavailable' };
  }

  const root = body[kind] as Record<string, any> | undefined;
  if (!root) return { status: 'unavailable' };

  const isArtist = kind === 'artist';
  const rawSummary = isArtist ? root.bio?.summary : root.wiki?.summary;

  return {
    status: 'found',
    info: {
      summary: cleanSummary(rawSummary),
      tags: readTags(kind === 'track' ? root.toptags : root.tags),
      listeners: toNumber(isArtist ? root.stats?.listeners : root.listeners),
      playcount: toNumber(isArtist ? root.stats?.playcount : root.playcount),
      url: typeof root.url === 'string' ? root.url : null,
      source: 'lastfm',
    },
  };
}

export function isFresh(fetchedAt: string | null | undefined, now = Date.now()): boolean {
  if (!fetchedAt) return false;
  const time = Date.parse(fetchedAt);
  return Number.isFinite(time) && now - time < CACHE_TTL_MS;
}
