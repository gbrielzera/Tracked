export type MusicErrorCode = 'rate_limited' | 'not_found' | 'network' | 'invalid_response' | 'unknown';

export class MusicApiError extends Error {
  readonly code: MusicErrorCode;

  constructor(code: MusicErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'MusicApiError';
    this.code = code;
  }
}

export function musicErrorMessage(error: unknown) {
  const code = error instanceof MusicApiError ? error.code : 'unknown';
  switch (code) {
    case 'rate_limited':
      return 'Muitas buscas em pouco tempo. Tente de novo em instantes.';
    case 'not_found':
      return 'Não encontramos esse item.';
    case 'network':
      return 'Sem conexão. Verifique sua internet.';
    default:
      return 'Não foi possível carregar a música. Tente de novo.';
  }
}
