import { MusicApiError } from '@/services/music/errors';

// De onde veio a falha, para dizer à pessoa o que fazer: sem internet ela confere o Wi-Fi; com o
// servidor ou o catálogo fora do ar, ela só precisa esperar.
export type FailureKind =
  | 'offline' // o celular está sem internet
  | 'server_down' // o servidor do Tracked (Supabase) não respondeu (fora do ar ou projeto pausado)
  | 'server_error' // o servidor respondeu com erro
  | 'catalog_down' // o catálogo de músicas (Deezer) não respondeu
  | 'catalog_busy' // o Deezer recusou por excesso de buscas
  | 'not_found'
  | 'unknown';

export const FAILURE_MESSAGES: Record<FailureKind, string> = {
  offline: 'Você está sem internet. Confira o Wi-Fi ou os dados móveis e tente de novo.',
  server_down: 'O servidor do Tracked não respondeu. Ele pode estar fora do ar; tente em instantes.',
  server_error: 'O servidor do Tracked teve um problema ao responder. Tente de novo.',
  catalog_down: 'O catálogo de músicas (Deezer) não respondeu. Tente em instantes.',
  catalog_busy: 'Muitas buscas em pouco tempo (a rede toda divide esse limite). Tente de novo em instantes.',
  not_found: 'Não encontramos esse item.',
  unknown: 'Algo deu errado. Tente de novo.',
};

// Mensagens típicas de falha de rede no React Native, no fetch e no supabase-js.
const NETWORK_TEXT = /network request failed|failed to fetch|fetch failed|network error|timed? ?out|aborted/i;

const textOf = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : '';

// `online`: o que o aparelho diz da conexão (false = sem internet; null = não se sabe).
export function classifyFailure(error: unknown, online: boolean | null): FailureKind {
  if (online === false) return 'offline';

  if (error instanceof MusicApiError) {
    if (error.code === 'rate_limited') return 'catalog_busy';
    if (error.code === 'not_found') return 'not_found';
    return 'catalog_down';
  }

  if (!error || typeof error !== 'object') return 'unknown';
  const name = 'name' in error && typeof error.name === 'string' ? error.name : '';
  const status = 'status' in error && typeof error.status === 'number' ? error.status : null;

  // Erros do supabase-js: falha de rede (incluindo a das Edge Functions e do login) ou 5xx = fora do ar.
  if (NETWORK_TEXT.test(textOf(error)) || /FetchError$/.test(name) || (status !== null && status >= 500)) {
    return 'server_down';
  }
  // Erro do PostgREST (tem `code`) ou de uma Edge Function que respondeu com erro.
  if ('code' in error || name === 'FunctionsHttpError' || status !== null) return 'server_error';
  return 'unknown';
}

export const failureMessage = (error: unknown, online: boolean | null) =>
  FAILURE_MESSAGES[classifyFailure(error, online)];
