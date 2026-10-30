import { createDeezerProvider } from './deezer';

// Provedor ativo. Trocar de fonte de catálogo = trocar esta linha.
export const musicProvider = createDeezerProvider();

export { MusicApiError, musicErrorMessage } from './errors';
export { toSnapshot } from './snapshot';
export type * from './types';
