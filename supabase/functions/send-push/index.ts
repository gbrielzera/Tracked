// Envia o push de uma notificação nova. Chamada por um Database Webhook (INSERT em notifications).
// Segredos: WEBHOOK_SECRET (confere o cabeçalho x-webhook-secret) e, opcionalmente, EXPO_ACCESS_TOKEN.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildMessage, deadTokens, isAuthorized, isExpoToken, parsePayload } from './message.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret) return json({ error: 'not_configured' }, 500);
  if (!isAuthorized(req.headers.get('x-webhook-secret'), secret)) return json({ error: 'unauthorized' }, 401);

  let record;
  try {
    record = parsePayload(await req.json());
  } catch {
    record = null;
  }
  // Eventos que não são INSERT em notifications não geram push.
  if (!record) return json({ skipped: true });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: tokenRows } = await admin.from('push_tokens').select('token').eq('user_id', record.recipient_id);
  const tokens = (tokenRows ?? []).map((row) => row.token).filter(isExpoToken);
  if (tokens.length === 0) return json({ sent: 0 });

  const { data: actor } = await admin
    .from('profiles')
    .select('username, display_name')
    .eq('id', record.actor_id)
    .maybeSingle();

  let mediaTitle: string | null = null;
  if (record.review_id) {
    const { data: review } = await admin
      .from('reviews')
      .select('media:media_items(title)')
      .eq('id', record.review_id)
      .maybeSingle();
    const media = Array.isArray(review?.media) ? review?.media[0] : review?.media;
    mediaTitle = media?.title ?? null;
  }

  const message = buildMessage(record, {
    actorName: actor?.display_name ?? 'Alguém',
    actorUsername: actor?.username ?? null,
    mediaTitle,
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let tickets: { status: 'ok' | 'error'; details?: { error?: string } }[] = [];
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        tokens.map((to) => ({ to, sound: 'default', channelId: 'default', ...message })),
      ),
      signal: AbortSignal.timeout(8000),
    });
    tickets = ((await response.json()) as { data?: typeof tickets }).data ?? [];
  } catch {
    return json({ sent: 0, error: 'expo_unavailable' });
  }

  // Aparelhos que desinstalaram o app: remove o token para não tentar de novo.
  const dead = deadTokens(tokens, tickets as never);
  if (dead.length > 0) await admin.from('push_tokens').delete().in('token', dead);

  return json({ sent: tokens.length - dead.length, removed: dead.length });
});
