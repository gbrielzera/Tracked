import { MusicApiError } from './errors';

const BASE_URL = 'https://api.deezer.com';
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

// Códigos de erro do Deezer. A API responde HTTP 200 com { error: { code } } no corpo.
const CODE_QUOTA = 4;
const CODE_NO_DATA = 800;

type Params = Record<string, string | number | undefined>;

export type DeezerClientOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  baseUrl?: string;
};

export type DeezerClient = {
  get<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T>;
};

type Failure = { error: MusicApiError; retryable: boolean };

export function createDeezerClient(options: DeezerClientOptions = {}): DeezerClient {
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const baseUrl = options.baseUrl ?? BASE_URL;

  function buildUrl(path: string, params?: Params) {
    const query = Object.entries(params ?? {})
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    return `${baseUrl}${path}${query ? `?${query}` : ''}`;
  }

  // Uma tentativa. Devolve o JSON ou lança Failure (com indicação se vale repetir).
  async function attempt(url: string, external?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const onExternalAbort = () => controller.abort();
    external?.addEventListener('abort', onExternalAbort);

    try {
      let response: Response;
      try {
        response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      } catch (cause) {
        // Cancelado por quem chamou: não é falha de rede, deixa propagar.
        if (external?.aborted) throw cause;
        const failure: Failure = { error: new MusicApiError('network', String(cause)), retryable: true };
        throw failure;
      }

      if (response.status === 429) {
        const failure: Failure = { error: new MusicApiError('rate_limited'), retryable: true };
        throw failure;
      }
      if (response.status >= 500) {
        const failure: Failure = { error: new MusicApiError('unknown', `HTTP ${response.status}`), retryable: true };
        throw failure;
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        const failure: Failure = { error: new MusicApiError('invalid_response'), retryable: false };
        throw failure;
      }

      const apiError = (json as { error?: { code?: number; message?: string } } | null)?.error;
      if (apiError) {
        if (apiError.code === CODE_QUOTA) {
          const failure: Failure = { error: new MusicApiError('rate_limited', apiError.message), retryable: true };
          throw failure;
        }
        if (apiError.code === CODE_NO_DATA) {
          const failure: Failure = { error: new MusicApiError('not_found', apiError.message), retryable: false };
          throw failure;
        }
        const failure: Failure = { error: new MusicApiError('unknown', apiError.message), retryable: false };
        throw failure;
      }
      return json;
    } finally {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    }
  }

  return {
    async get<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
      const url = buildUrl(path, params);
      let last: MusicApiError | null = null;

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
          return (await attempt(url, signal)) as T;
        } catch (thrown) {
          const failure = thrown as Partial<Failure>;
          if (!failure.error) throw thrown; // cancelamento ou erro inesperado
          last = failure.error;
          if (!failure.retryable || i === MAX_ATTEMPTS - 1) throw last;
          // Backoff exponencial com jitter: 400ms, 800ms (+ até 250ms).
          await sleep(BASE_DELAY_MS * 2 ** i + random() * 250);
        }
      }
      throw last ?? new MusicApiError('unknown');
    },
  };
}

export const deezerClient = createDeezerClient();
