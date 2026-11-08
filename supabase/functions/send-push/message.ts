// Lógica pura do push (sem APIs do Deno), para ser testada fora do Supabase.

export type NotificationType = 'follow' | 'like' | 'comment';

export type NotificationRecord = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  review_id: string | null;
};

export type PushContext = {
  actorName: string;
  actorUsername: string | null;
  mediaTitle: string | null;
};

export type PushMessage = {
  title: string;
  body: string;
  // Lido pelo app ao tocar na notificação (abre a review ou o perfil certo).
  data: Record<string, string>;
};

const TYPES: NotificationType[] = ['follow', 'like', 'comment'];
const MAX_NAME = 40;
const MAX_TITLE = 60;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// O webhook do banco envia { type: 'INSERT', table, record }. Qualquer outra coisa é ignorada.
export function parsePayload(raw: unknown): NotificationRecord | null {
  const body = raw as { type?: unknown; table?: unknown; record?: Record<string, unknown> } | null;
  if (!body || body.type !== 'INSERT' || body.table !== 'notifications' || !body.record) return null;

  const { id, recipient_id, actor_id, type, review_id } = body.record;
  if (typeof id !== 'string' || typeof recipient_id !== 'string' || typeof actor_id !== 'string') return null;
  if (typeof type !== 'string' || !TYPES.includes(type as NotificationType)) return null;
  return {
    id,
    recipient_id,
    actor_id,
    type: type as NotificationType,
    review_id: typeof review_id === 'string' ? review_id : null,
  };
}

// Não inclui o texto da review: o push pode aparecer na tela bloqueada.
export function buildMessage(record: NotificationRecord, context: PushContext): PushMessage {
  const name = clip(context.actorName, MAX_NAME);
  const of = context.mediaTitle ? ` de ${clip(context.mediaTitle, MAX_TITLE)}` : '';

  switch (record.type) {
    case 'follow':
      return {
        title: 'Novo seguidor',
        body: `${name} começou a seguir você.`,
        data: { type: 'follow', username: context.actorUsername ?? '' },
      };
    case 'like':
      return {
        title: 'Nova curtida',
        body: `${name} curtiu sua review${of}.`,
        data: { type: 'like', reviewId: record.review_id ?? '' },
      };
    case 'comment':
      return {
        title: 'Novo comentário',
        body: `${name} comentou na sua review${of}.`,
        data: { type: 'comment', reviewId: record.review_id ?? '' },
      };
  }
}

// Comparação em tempo constante, para o segredo do webhook não vazar por tempo de resposta.
export function isAuthorized(received: string | null, secret: string): boolean {
  if (!received || received.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= received.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export const isExpoToken = (token: string) => /^Expo(nent)?PushToken\[.+\]$/.test(token);

export type Ticket = { status: 'ok' } | { status: 'error'; message?: string; details?: { error?: string } };

// Tokens que o Expo diz que não existem mais devem ser apagados do banco.
export function deadTokens(tokens: string[], tickets: Ticket[]): string[] {
  return tokens.filter((_, i) => {
    const ticket = tickets[i];
    return ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered';
  });
}

// O Expo aceita no máximo 100 mensagens por requisição.
export const EXPO_BATCH = 100;

export function chunk<T>(items: T[], size = EXPO_BATCH): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Um aparelho registrado duas vezes não deve receber o aviso duas vezes.
export const uniqueTokens = (tokens: string[]) => [...new Set(tokens)];

// 429 (limite de envio) e 5xx (instabilidade do Expo) valem uma nova tentativa.
// Outros 4xx são erro do pedido (ex.: credencial) e repetir não resolve.
export const isRetryable = (status: number) => status === 429 || status >= 500;

export type BatchSummary = {
  sent: number;
  dead: string[];
  // Quantos aparelhos falharam, por motivo (ex.: { MessageRateExceeded: 1 }).
  errors: Record<string, number>;
};

// Resultado de um lote: o i-ésimo ticket corresponde ao i-ésimo token.
export function summarizeTickets(tokens: string[], tickets: Ticket[]): BatchSummary {
  const summary: BatchSummary = { sent: 0, dead: [], errors: {} };
  tokens.forEach((token, i) => {
    const ticket = tickets[i];
    if (ticket?.status === 'ok') {
      summary.sent++;
      return;
    }
    const reason = !ticket ? 'missing_ticket' : (ticket.details?.error ?? 'unknown');
    if (reason === 'DeviceNotRegistered') summary.dead.push(token);
    summary.errors[reason] = (summary.errors[reason] ?? 0) + 1;
  });
  return summary;
}

// Soma os erros de vários lotes num só resumo.
export function mergeErrors(into: Record<string, number>, from: Record<string, number>) {
  for (const [reason, count] of Object.entries(from)) into[reason] = (into[reason] ?? 0) + count;
  return into;
}
