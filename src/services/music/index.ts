import { createDeezerProvider } from './deezer';

// Provedor ativo. Trocar de fonte de catálogo = trocar esta linha.
export const musicProvider = createDeezerProvider();

export { MusicApiError, musicErrorMessage } from './errors';
export { toSnapshot } from './snapshot';
export type * from './types';

import type { MediaItem, MediaKind, Page, PageOptions } from './types';

// Busca por tipo escolhido em tempo de execução (o provider usa overloads por tipo).
export const searchMedia = musicProvider.search as unknown as (
  kind: MediaKind,
  query: string,
  opts?: PageOptions,
) => Promise<Page<MediaItem>>;
