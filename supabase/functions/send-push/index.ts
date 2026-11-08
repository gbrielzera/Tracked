// Envia o push de uma notificação nova. Chamada por um Database Webhook (INSERT em notifications).
// Segredos: WEBHOOK_SECRET (confere o cabeçalho x-webhook-secret) e, opcionalmente, EXPO_ACCESS_TOKEN.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildMessage,
  chunk,
  isAuthorized,
  isExpoToken,
  isRetryable,
  mergeErrors,
  parsePayload,
  summarizeTickets,
  uniqueTokens,
  type PushMessage,
  type Ticket,
} from './message.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RETRY_DELAY_MS = 1000;

type BatchOutcome = { ok: true; tickets: Ticket[] } | { ok: false; reason: string };

// Envia um lote ao Expo. Se ele responder com limite ou instabilidade, tenta mais uma vez.
async function sendBatch(tokens: string[], message: PushMessage, headers: Record<string, string>): Promise<BatchOutcome> {
  const body = JSON.stringify(tokens.map((to) => ({ to, sound: 'default', channelId: 'default', ...message })));

  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) });
    } catch {
      if (attempt === 2) return { ok: false, reason: 'expo_unreachable' };
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }

    if (response.ok) {
      const parsed = (await response.json().catch(() => null)) as { data?: Ticket[] } | null;
      if (!parsed || !Array.isArray(parsed.data)) return { ok: false, reason: 'expo_bad_response' };
      return { ok: true, tickets: parsed.data };
    }

    // O Expo explica o erro do pedido em { errors: [{ code, message }] }.
    const detail = (await response.json().catch(() => null)) as { errors?: { code?: string; message?: string }[] } | null;
    console.error('Expo push HTTP', response.status, JSON.stringify(detail?.errors ?? []));
    if (attempt === 1 && isRetryable(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }
    return { ok: false, reason: detail?.errors?.[0]?.code ?? `http_${response.status}` };
  }
  return { ok: false, reason: 'expo_unreachable' };
}

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

  const { data: tokenRows, error: tokenError } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', record.recipient_id);
  if (tokenError) return json({ sent: 0, error: 'tokens_unavailable', detail: tokenError.message });
  const tokens = uniqueTokens((tokenRows ?? []).map((row) => row.token).filter(isExpoToken));
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

  // Envia em lotes de até 100 e junta o resultado de todos.
  let sent = 0;
  const dead: string[] = [];
  const errors: Record<string, number> = {};
  for (const batch of chunk(tokens)) {
    const outcome = await sendBatch(batch, message, headers);
    if (!outcome.ok) {
      errors[outcome.reason] = (errors[outcome.reason] ?? 0) + batch.length;
      continue;
    }
    const summary = summarizeTickets(batch, outcome.tickets);
    sent += summary.sent;
    dead.push(...summary.dead);
    mergeErrors(errors, summary.errors);
  }
  if (Object.keys(errors).length > 0) console.error('Expo push falhas', JSON.stringify(errors));

  // Aparelhos que desinstalaram o app: remove o token para não tentar de novo.
  if (dead.length > 0) await admin.from('push_tokens').delete().in('token', dead);

  return json({ sent, removed: dead.length, failed: tokens.length - sent, errors });
});
