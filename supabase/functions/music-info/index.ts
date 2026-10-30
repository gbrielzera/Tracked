// Descrição de artista, álbum ou faixa vinda do Last.fm, com cache em media_items.info.
// A chave do Last.fm fica só nos secrets desta função (LASTFM_API_KEY).
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  EMPTY_INFO,
  Kind,
  MusicInfo,
  buildLookupUrl,
  isFresh,
  parseResponse,
} from './lastfm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const KINDS: Kind[] = ['track', 'album', 'artist'];
const LASTFM_TIMEOUT_MS = 8000;

type Body = { kind: Kind; externalId: string; title: string; artistName: string | null };

function readBody(raw: unknown): Body | null {
  const b = raw as Record<string, unknown> | null;
  if (!b || typeof b !== 'object') return null;
  const { kind, externalId, title, artistName } = b;
  if (typeof kind !== 'string' || !KINDS.includes(kind as Kind)) return null;
  if (typeof externalId !== 'string' || !/^[0-9]{1,20}$/.test(externalId)) return null;
  if (typeof title !== 'string' || title.length === 0 || title.length > 300) return null;
  if (artistName != null && (typeof artistName !== 'string' || artistName.length > 300)) return null;
  return { kind: kind as Kind, externalId, title, artistName: (artistName as string | null) ?? null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiKey = Deno.env.get('LASTFM_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' }, 500);

  // Visitantes (login anônimo) também podem consultar; só exigimos um usuário válido.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: 'unauthorized' }, 401);

  let body: Body | null;
  try {
    body = readBody(await req.json());
  } catch {
    body = null;
  }
  if (!body) return json({ error: 'invalid_body' }, 400);

  const admin = createClient(url, serviceKey);
  const { data: row } = await admin
    .from('media_items')
    .select('id, title, artist_name, info, info_fetched_at')
    .eq('provider', 'deezer')
    .eq('kind', body.kind)
    .eq('external_id', body.externalId)
    .maybeSingle();

  if (row?.info && isFresh(row.info_fetched_at)) {
    return json({ info: row.info as MusicInfo, cached: true });
  }

  // Se o item já existe no banco, confiamos nos nomes salvos; senão, nos enviados (sem gravar cache).
  const lookup = {
    kind: body.kind,
    title: row?.title ?? body.title,
    artistName: row ? row.artist_name : body.artistName,
  };
  const lookupUrl = buildLookupUrl(lookup, apiKey);
  if (!lookupUrl) return json({ info: null });

  let result;
  try {
    const response = await fetch(lookupUrl, { signal: AbortSignal.timeout(LASTFM_TIMEOUT_MS) });
    result = parseResponse(body.kind, await response.json());
  } catch {
    result = { status: 'unavailable' as const };
  }

  // Falha temporária: responde sem descrição e não guarda nada.
  if (result.status === 'unavailable') return json({ info: null, unavailable: true });

  const info: MusicInfo = result.status === 'found' ? result.info : EMPTY_INFO;
  if (row) {
    await admin
      .from('media_items')
      .update({ info, info_fetched_at: new Date().toISOString() })
      .eq('id', row.id);
  }
  return json({ info, cached: false });
});
